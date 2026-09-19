/* CSI Engine — núcleo de busca e expansão controlada.
 * Não diagnostica. Não altera o dicionário canônico silenciosamente.
 */
(function (global) {
  "use strict";

  const QUEUE_KEY = "csi.expansion.queue.v1";

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  }

  function flattenTerms(bloco) {
    const out = [];
    if (Array.isArray(bloco.termos_compartilhados)) out.push(...bloco.termos_compartilhados);
    if (Array.isArray(bloco.termos_populares)) out.push(...bloco.termos_populares);
    if (bloco.idiomas && typeof bloco.idiomas === "object") {
      Object.values(bloco.idiomas).forEach(items => {
        if (Array.isArray(items)) out.push(...items);
      });
    }
    return out;
  }

  function allBlocks(database) {
    return Array.isArray(database) ? database : [];
  }

  function findExact(term, database) {
    const needle = normalize(term);
    for (const bloco of allBlocks(database)) {
      const terms = [bloco.nome_canonico, ...flattenTerms(bloco)].map(normalize);
      if (terms.includes(needle)) {
        return {
          type: "exact",
          anchor: bloco.codigo_ancora,
          canonicalName: bloco.nome_canonico,
          block: bloco
        };
      }
    }
    return null;
  }

  function makeProvisionalCode(term) {
    // Código determinístico: a mesma expressão gera o mesmo candidato.
    let hash = 2166136261;
    for (const ch of normalize(term)) {
      hash ^= ch.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
    return "AUTO." + hex;
  }

  function readQueue() {
    try {
      return JSON.parse(global.localStorage.getItem(QUEUE_KEY) || "[]");
    } catch (_) {
      return [];
    }
  }

  function writeQueue(queue) {
    global.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue, null, 2));
  }

  function queueProposal(proposal) {
    const queue = readQueue();
    const existing = queue.find(item => normalize(item.termo_original) === normalize(proposal.termo_original));
    if (existing) return existing;
    queue.push(proposal);
    writeQueue(queue);
    return proposal;
  }

  function findCanonicalCandidate(umlsResult, database) {
    if (!umlsResult) return null;
    const target = normalize(umlsResult.name);
    if (!target) return null;

    for (const bloco of allBlocks(database)) {
      const terms = [bloco.nome_canonico, ...flattenTerms(bloco)].map(normalize);
      if (terms.includes(target)) {
        return {
          anchor: bloco.codigo_ancora,
          canonicalName: bloco.nome_canonico,
          reason: "exact_name_or_existing_term"
        };
      }
    }
    return null;
  }

  function makeConceptCode(umlsResult, term) {
    if (umlsResult?.cui) return "AUTO." + String(umlsResult.cui).toUpperCase();
    return makeProvisionalCode(term);
  }

  function buildProposal(term, context = {}) {
    const now = new Date().toISOString();
    const umlsResult = context.umlsResult || null;
    const candidate = context.canonicalCandidate || null;
    const research = context.research || null;
    const umlsAtoms = Array.isArray(context.umlsAtoms) ? context.umlsAtoms : [];
    const sinonimos = Array.from(new Set(
      umlsAtoms
        .map(atom => atom?.name || atom?.term || atom?.literal || null)
        .filter(Boolean)
        .map(value => String(value).trim())
        .filter(value => normalize(value) !== normalize(term))
    )).slice(0, 20);

    return {
      proposal_id: "EXP-" + now.replace(/[-:.TZ]/g, "").slice(0, 14) + "-" + makeProvisionalCode(term).slice(-8),
      termo_original: String(term).trim(),
      codigo_provisorio: candidate?.anchor || makeConceptCode(umlsResult, term),
      nome_canonico_provisorio: candidate?.canonicalName || umlsResult?.name || String(term).trim(),
      sinonimos,
      tipo: candidate ? "synonym_for_existing_anchor" : "candidate_semantic_unit",
      status: "pending_review",
      origem: {
        provider: "UMLS",
        queried_at: now,
        query: context.umlsQuery || term,
        cui: umlsResult?.cui || null,
        rootSource: umlsResult?.rootSource || null
      },
      correspondencia_csi: candidate || null,
      evidencias: (research?.results || []).slice(0, 5).map(item => ({
        pmid: item.pmid,
        title: item.title,
        url: "https://pubmed.ncbi.nlm.nih.gov/" + item.pmid + "/"
      })),
      regra: "UMLS identifica conceitos e candidatos. A promoção para uma âncora existente ou a criação de uma nova âncora exige revisão semântica."
    };
  }

  global.CSIEngine = {
    normalize,
    findExact,
    findCanonicalCandidate,
    makeProvisionalCode,
    readQueue,
    queueProposal,
    buildProposal
  };
})(window);
