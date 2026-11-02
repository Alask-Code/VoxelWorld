import testInventoryOperations from './inventory.test';
import testBlockTargeting from './blockTarget.test';
import testCameraRelativeMovement from './movement.test';
import testDroppedItems from './droppedItems.test';
import testCraftingRules from './recipes.test';
import testWorldStorage from './storage.test';
import testWorldGeneration from './world.test';
import testBlockMining from './blockMining.test';

async function run() {
  const tests: Array<[string, () => void | Promise<void>]> = [
    ['geração determinística e malha de chunks', testWorldGeneration],
    ['seleção central e posicionamento de blocos', testBlockTargeting],
    ['movimentação relativa à direção da câmera', testCameraRelativeMovement],
    ['drops no chão e coleta pelo jogador', testDroppedItems],
    ['empilhamento, divisão e remoção de itens', testInventoryOperations],
    ['validação e produção de receitas', testCraftingRules],
    ['persistência local, backup e validação de caminhos', testWorldStorage],
    ['tempo de mineração por dureza e ferramenta', testBlockMining]
  ];

  await tests.reduce<Promise<void>>(async (previous, [name, test]) => {
    await previous;
    await test();
    process.stdout.write(`✓ ${name}\n`);
  }, Promise.resolve());
  process.stdout.write(`${tests.length} testes passaram.\n`);
}

run().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
