/* CSI NCBI Provider
 * Pesquisa PubMed por E-utilities.
 * A camada não diagnostica nem decide equivalência semântica.
 */
(function (global) {
  "use strict";

  const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
  const TOOL = "CSI-Motor-Explorer";
  const EMAIL = global.CSI_CONFIG?.ncbiEmail || "";

  function makeUrl(endpoint, params) {
    const url = new URL(BASE + "/" + endpoint);
    Object.entries({
      tool: TOOL,
      email: EMAIL,
      retmode: "json",
      ...params
    }).forEach(([key, value]) => url.searchParams.set(key, value));
    return url.toString();
  }

  async function searchPubMed(term, options = {}) {
    const query = String(term || "").trim();
    if (!query) throw new Error("Termo vazio.");

    const retmax = Math.min(Math.max(Number(options.retmax || 5), 1), 10);
    const searchUrl = makeUrl("esearch.fcgi", {
      db: "pubmed",
      term: query,
      retmax,
      sort: "relevance"
    });

    const searchResponse = await fetch(searchUrl, { headers: { "Accept": "application/json" } });
    if (!searchResponse.ok) throw new Error("NCBI ESearch HTTP " + searchResponse.status);
    const searchData = await searchResponse.json();
    const ids = searchData?.esearchresult?.idlist || [];

    if (!ids.length) {
      return { query, count: 0, results: [] };
    }

    const summaryUrl = makeUrl("esummary.fcgi", {
      db: "pubmed",
      id: ids.join(","),
      version: "2.0"
    });

    const summaryResponse = await fetch(summaryUrl, { headers: { "Accept": "application/json" } });
    if (!summaryResponse.ok) throw new Error("NCBI ESummary HTTP " + summaryResponse.status);
    const summaryData = await summaryResponse.json();
    const result = summaryData?.result || {};

    const results = ids.map(pmid => {
      const row = result[pmid] || {};
      return {
        pmid,
        title: row.title || "",
        pubdate: row.pubdate || "",
        journal: row.fulljournalname || "",
        pmcid: row.pmcid || null
      };
    });

    return {
      query,
      count: Number(searchData?.esearchresult?.count || results.length),
      results
    };
  }

  global.CSINCbi = {
    searchPubMed
  };
})(window);
