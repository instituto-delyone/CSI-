/**
 * CSI Pending Review Worker
 *
 * POST /api/csi/pending
 * Body: { pending: { termo_original, proposta, criado_em, status } }
 *
 * Secrets:
 * - GITHUB_TOKEN: GitHub token with contents:write for instituto-delyone/CSI-
 *
 * Optional vars:
 * - GITHUB_REPO (default: instituto-delyone/CSI-)
 * - PENDING_PATH (default: data/pendencias/csi_pending_review.json)
 * - ALLOWED_ORIGIN
 */
const DEFAULT_REPO = "instituto-delyone/CSI-";
const DEFAULT_PATH = "data/pendencias/csi_pending_review.json";

function cors(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS"
  };
}

function json(data, status, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors(env) }
  });
}

async function github(env, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + env.GITHUB_TOKEN,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error("GitHub HTTP " + response.status);
  return response;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env) });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, env);
    if (!env.GITHUB_TOKEN) return json({ error: "GITHUB_TOKEN não configurado." }, 500, env);

    try {
      const body = await request.json();
      const pending = body?.pending;
      const term = String(pending?.termo_original || "").trim();
      if (!term) return json({ error: "termo_original obrigatório." }, 400, env);

      const repo = env.GITHUB_REPO || DEFAULT_REPO;
      const path = env.PENDING_PATH || DEFAULT_PATH;
      const api = "https://api.github.com/repos/" + repo + "/contents/" + path;

      let queue = [];
      let sha = null;

      const current = await github(env, api);
      const currentData = await current.json();
      sha = currentData.sha || null;

      if (currentData.content) {
        const decoded = atob(currentData.content.replace(/\n/g, ""));
        try { queue = JSON.parse(decoded); } catch (_) { queue = []; }
      }

      const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
      if (!queue.some(item => normalize(item?.termo_original) === normalize(term))) {
        queue.push({
          ...pending,
          termo_original: term,
          status: "pending_review",
          recebido_em: new Date().toISOString()
        });
      }

      const content = btoa(unescape(encodeURIComponent(JSON.stringify(queue, null, 2) + "\n")));
      const payload = {
        message: "CSI: adicionar termo à fila de pendências",
        content,
        ...(sha ? { sha } : {})
      };

      const updated = await github(env, api, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await updated.json();

      return json({
        ok: true,
        path,
        count: queue.length,
        commit_sha: result?.commit?.sha || null
      }, 200, env);
    } catch (error) {
      return json({ error: error?.message || "Falha ao gravar pendência." }, 500, env);
    }
  }
};
