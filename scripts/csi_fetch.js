/**
 * ==========================================
 * CSI FETCH ENGINE - O CABO DE CONEXÃO
 * Motor de busca e injeção do dicionário canônico
 * Arquitetura: Primeiro Meta-Engenheiro da Linguagem
 * ==========================================
 */

const CSI_CONFIG = {
  // URLs RAW exatas apontando para a Fonte Única da Verdade no repositório CSI-
  urlCore: "https://raw.githubusercontent.com/instituto-delyone/CSI-/main/data/csi_core.json",
  urlSintomas: "https://raw.githubusercontent.com/instituto-delyone/CSI-/main/data/csi_sintomas.json"
};

class CSI_Conector {
  constructor() {
    this.core = null;
    this.sintomas = null;
    this.status = "desconectado";
  }

  // 1. Função que "liga o cabo na tomada" e puxa os dados em tempo real
  async conectarNuvem() {
    console.log("[CSI Engine] Iniciando conexão com o núcleo canônico na nuvem...");
    
    try {
      // Busca simultânea (paralela) dos dois arquivos para máxima velocidade
      const [respostaCore, respostaSintomas] = await Promise.all([
        fetch(CSI_CONFIG.urlCore),
        fetch(CSI_CONFIG.urlSintomas)
      ]);

      if (!respostaCore.ok || !respostaSintomas.ok) {
        throw new Error("Servidor do CSI negou o acesso. Verifique se os arquivos existem na pasta 'data'.");
      }

      // Desempacota o texto (JSON) transformando-o em inteligência viva na memória
      this.core = await respostaCore.json();
      this.sintomas = await respostaSintomas.json();
      this.status = "conectado";

      console.log("[CSI Engine] Cérebro conectado com sucesso! Matriz semiológica carregada.");
      return true;

    } catch (erro) {
      console.error("[CSI Engine] Falha no cabo de conexão estrutural:", erro);
      this.status = "erro";
      return false;
    }
  }

  // 2. Função de inteligência: Lê o que o humano digitou e devolve o código da máquina
  traduzirTermoParaCodigo(termoDigitado) {
    if (this.status !== "conectado" || !this.sintomas) {
      console.warn("[CSI Engine] O dicionário canônico não está carregado no momento.");
      return null;
    }

    const termoLimpo = termoDigitado.toLowerCase().trim();

    // O "cilindro" processando a informação: varre a coluna central em busca do significado
    if (this.sintomas.coluna_central_semiologia) {
      for (const bloco of this.sintomas.coluna_central_semiologia) {
        
        // Procura primeiro nas gírias e regionalismos
        if (bloco.termos_populares && bloco.termos_populares.some(t => t.toLowerCase() === termoLimpo)) {
          return bloco.codigo_ancora;
        }
        
        // Procura nos idiomas oficiais (Português, Inglês, Espanhol)
        if (bloco.idiomas) {
          for (const idioma in bloco.idiomas) {
            if (bloco.idiomas[idioma] && bloco.idiomas[idioma].some(t => t.toLowerCase() === termoLimpo)) {
              return bloco.codigo_ancora;
            }
          }
        }
      }
    }

    return null; // A máquina ainda não aprendeu essa palavra
  }
}

// Expõe a máquina de conexão para que o MedUnity e o Diagnosis possam usá-la
export const csiEngine = new CSI_Conector();
