# Pendências do CSI

Esta pasta é o destino versionado para propostas que ainda não possuem associação semântica definida.

Fluxo:
1. O Motor Explorer recebe um termo.
2. Se não houver associação local nem correspondência canônica suficiente, o termo pode ser enviado para a fila de pendências.
3. A pendência é revisada manualmente.
4. O responsável define código/âncora, nome canônico e nomes associados.
5. Após revisão, a alteração deve ser incorporada aos arquivos canônicos do CSI.

A interface web mantém a fila de trabalho no navegador e permite exportá-la como JSON. A persistência automática diretamente no repositório deve ser feita por uma ponte segura (Worker), sem expor token do GitHub no navegador.
