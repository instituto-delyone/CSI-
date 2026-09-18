/* CSI UMLS Provider
 * Usa o mesmo proxy seguro já utilizado pelo Diagnosys.
 * A chave UMLS permanece exclusivamente no Cloudflare Worker.
 */
(function (global) {
  "use strict";

  const DEFAULT_PROXY_URL =
    "https://diagnosys-umls-proxy.dr-delyone.workers.dev/api/umls";

  class CSIUMLS {
    constructor(options = {}) {
      const configured =
        options.baseUrl ||
        global.CSI_CONFIG?.UMLS_API_BASE ||
        DEFAULT_PROXY_URL;

      this.baseUrl = String(configured).replace(/\/$/, "");
      this.timeoutMs = Number(options.timeoutMs || 10000);
    }

    buildQuery(params = {}) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === "") continue;
        query.set(key, Array.isArray(value) ? value.join(",") : String(value));
      }
      const text = query.toString();
      return text ? "?" + text : "";
    }

    async request(path, params = {}) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const url =
          this.baseUrl +
          "/" +
          String(path).replace(/^\//, "") +
          this.buildQuery(params);

        const response = await fetch(url, {
          headers: { "Accept": "application/json" },
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("UMLS proxy HTTP " + response.status);
        }

        return await response.json();
      } catch (error) {
        if (error?.name === "AbortError") {
          throw new Error("Tempo limite ao consultar o UMLS.");
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }

    async search(term, options = {}) {
      const text = String(term || "").trim();
      if (!text) throw new Error("Termo vazio.");

      const data = await this.request("search", {
        string: text,
        pageSize: options.pageSize || 10,
        pageNumber: options.pageNumber || 1,
        ...options
      });

      const rows = Array.isArray(data?.result?.results)
        ? data.result.results
        : [];

      return {
        query: text,
        results: rows.map(item => ({
          cui: item?.ui || null,
          name: item?.name || null,
          rootSource: item?.rootSource || null,
          uri: item?.uri || null,
          raw: item
        })),
        raw: data
      };
    }

    async getConcept(cui) {
      if (!cui) throw new Error("CUI vazio.");
      const data = await this.request(
        "concept/" + encodeURIComponent(cui)
      );
      const result = data?.result || {};
      return {
        cui: result.ui || cui,
        name: result.name || null,
        semanticTypes: result.semanticTypes || [],
        raw: data
      };
    }

    async getAtoms(cui, options = {}) {
      if (!cui) throw new Error("CUI vazio.");
      const data = await this.request(
        "concept/" + encodeURIComponent(cui) + "/atoms",
        options
      );
      return {
        cui,
        atoms: Array.isArray(data?.result) ? data.result : [],
        raw: data
      };
    }
  }

  global.CSIUMLS = new CSIUMLS();
})(window);
