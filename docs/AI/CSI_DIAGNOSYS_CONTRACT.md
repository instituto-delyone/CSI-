# CSI ↔ Diagnosys — contrato futuro

## Princípio

O CSI resolve linguagem. O Diagnosys resolve contexto clínico e raciocínio.

Nenhum dos dois deve absorver silenciosamente a responsabilidade do outro.

## Entrada do CSI

```json
{
  "raw_text": "paciente está puxando o ar",
  "normalized_text": "puxando o ar",
  "semantic_anchor": "SYM.003",
  "canonical_term": "Dispneia",
  "match_type": "popular_term",
  "confidence": 1.0,
  "clinical_inference": null,
  "diagnosis": null
}
```

## Saída para o Diagnosys

O Diagnosys recebe a unidade semântica junto do texto original e do contexto disponível:

```json
{
  "semantic_event": {
    "raw_text": "paciente está puxando o ar",
    "anchor": "SYM.003",
    "canonical_term": "Dispneia"
  },
  "context": {
    "patient_state": {},
    "conversation": {},
    "investigations": []
  }
}
```

## Regra de não-confusão

```
CSI:
texto → significado linguístico

Diagnosys:
significado + paciente + tempo + contexto → raciocínio clínico
```

Uma âncora CSI não significa diagnóstico, etiologia, gravidade ou conduta.

## Direção futura

1. CSI pode fornecer normalização para o Diagnosys.
2. Diagnosys pode devolver contexto para desambiguar termos.
3. O conhecimento clínico permanece no Diagnosys/Knowledge Base.
4. O vocabulário semântico permanece no CSI.
5. Expansões aprovadas no CSI podem ser consumidas pelo Diagnosys por versão.
