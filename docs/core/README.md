# Guia do núcleo e contribuições

## Arquitetura

O projeto separa domínio, aplicação, estado, apresentação e persistência:

| Área | Responsabilidade | Caminhos principais |
|---|---|---|
| Domínio | Tipos serializáveis, geração procedural, catálogo e regras puras | `src/domain/` |
| Aplicação | Casos de uso para carregar e salvar mundos | `src/application/worldStorage.ts` |
| Estado da sessão | Mundo aberto, snapshot, overlay, hotbar e oxigênio | `src/stores/game.ts` |
| Engine | Canvas Three.js, raycast, colisão, chunks e entidades visuais | `src/engine/` |
| Interface | HUD, inventário, crafting, menus e configurações | `src/pages/`, `src/style.css` |
| Persistência desktop | IPC e arquivos locais com validação, salvamento atômico e backup | `electron/` |
| Testes | Testes executáveis sem depender da interface visual | `tests/` |

O renderer não acessa Node.js diretamente. Operações de disco atravessam a API tipada do preload e os handlers IPC do Electron.

## Regras de domínio

- Mantenha regras independentes de interface em `src/domain` e cubra-as com testes determinísticos.
- `WorldSnapshot` contém o estado durável do jogador e do mundo. Drops no chão usam `DroppedItemSnapshot`: ID estável, stack, posição, velocidade opcional e tick mínimo de coleta. A engine simula gravidade e colisões com blocos; a apresentação anima rotação e flutuação.
- Alterações de terreno usam `blockEdits` sobre o terreno procedural; consulte `getBlockAt` em vez de inferir a existência de blocos apenas pela altura do terreno.
- A física usa a posição dos pés do personagem. Colisão, apoio e posicionamento devem seguir as dimensões centralizadas em `src/engine/playerMovement.ts`.
- Efeitos visuais e objetos Three.js pertencem ao engine; dados que precisam sobreviver ao save não devem ficar apenas em refs ou estado React.
- O inventário usa stacks com IDs do catálogo. Reutilize funções de `src/domain/inventory.ts` em vez de duplicar regras de empilhamento.
- Ferramentas persistem dano no stack; use `damageItem` para aplicar desgaste e remova o item quando atingir a durabilidade máxima definida no catálogo.

## Dados e persistência

`WorldSnapshot` é armazenado tanto no navegador de desenvolvimento quanto nos saves do Electron. Ao mudar seu formato:

1. Atualize os tipos e defaults em `src/domain/world.ts`.
2. Faça saves anteriores continuarem legíveis usando migração/default quando possível.
3. Valide o novo conteúdo em `electron/worldStorage.ts`; rejeite formatos malformados em vez de normalizá-los silenciosamente.
4. Teste criação, salvamento, carregamento, backup e recuperação em `tests/storage.test.ts`.
5. Considere o limite de tamanho do save e limite de quantidade para coleções de entidades.

O formato de mundo atualmente declara `WORLD_FORMAT_VERSION = 1`. Alterações incompatíveis exigem estratégia explícita de migração/versionamento.

## Adicionando uma feature

1. Identifique o estado autoritativo e o módulo responsável antes de criar um novo subsistema.
2. Implemente a regra central em uma função pequena e testável; mantenha a UI/engine como integração.
3. Conecte entrada, atualização de estado, representação visual e persistência quando a feature exigir cada uma dessas superfícies.
4. Cubra casos normais, limites, inventário cheio e compatibilidade com saves, conforme aplicável.
5. Atualize a documentação de API/conteúdo e a matriz de aderência do README se a capacidade anunciada mudar.

## Validar mudanças

```sh
npm test
npx tsc --noEmit
npm run build
```

Para mudanças localizadas, rode ESLint nos arquivos tocados. `npm run lint` aplica correções automáticas ao projeto inteiro; não use esse comando como verificação read-only.

Para adicionar blocos, itens, receitas ou texturas, siga o guia [de conteúdo e catálogo](../api/content.md) e a referência [de contratos internos](../api/README.md).
