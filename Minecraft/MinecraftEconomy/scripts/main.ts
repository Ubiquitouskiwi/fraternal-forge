import { world, system, BlockPermutation, EntityInventoryComponent } from "@minecraft/server";
import { MinecraftBlockTypes, MinecraftDimensionTypes } from "@minecraft/vanilla-data";

let ticksSinceLoad = 0;
let knownBlocks: {[id: string]: number} = {}

function mainTick() {
  // Keep track of in game time ticks
  ticksSinceLoad++;

  // Give the world time to load. Wait 100 game ticks
  if (ticksSinceLoad === 100) {
    world.sendMessage("Hello starter! Tick: " + system.currentTick);
    initialize();
  } 

  if (ticksSinceLoad % 100 == 0) {
    scanInventories();
  }

  system.run(mainTick);
}

function scanInventories() {
  let players = world.getPlayers();
  for (let player of players) {
  
    let playerInventory = player.getComponent("inventory") as EntityInventoryComponent;
    let invContainer = playerInventory.container;
    if (invContainer !== undefined) {
      for (let i = 0; i < invContainer.size; i++) {
        let invItem = invContainer.getItem(i);

        if (invItem !== undefined) {
          let keyMod = invItem.typeId.replace("minecraft:", "");
          if (!(keyMod in knownBlocks)) {
            
            knownBlocks[keyMod] = invItem.amount;
          } else {
            knownBlocks[keyMod] += invItem.amount;
          }
        }
      }
    }
    world.sendMessage(`Total Blocks found so far. ${JSON.stringify(knownBlocks, null, 4)}`);
  }
}



function findTopmostBlockUsingPlayer(x: number, z: number) {
  const ow = world.getDimension("overworld");

  let y = -60;

  const players = world.getPlayers();

  // use a little bit below the player's Y to suggest a location. Move upward until we find air.
  if (players.length > 0) {
    y = Math.max(players[0].location.y - 8, -62);

    let block = ow.getBlock({ x: x, y: y, z: z });

    while (block && !block.permutation.matches("minecraft:air")) {
      y++;

      block = ow.getBlock({ x: x, y: y, z: z });
    }
  }

  return y;
}

function initialize() {
  const overworld = world.getDimension("overworld");

  const spawnLocation = world.getDefaultSpawnLocation();
  
  const chest = overworld.getBlock({x: spawnLocation.x + 2, z: spawnLocation.z + 2 , y: findTopmostBlockUsingPlayer(spawnLocation.x + 2, spawnLocation.z + 2)});

  world.sendMessage("Adding chest at x:" + spawnLocation.x + 2 + " y:" + findTopmostBlockUsingPlayer(spawnLocation.x + 2, spawnLocation.z + 2) + " z:" + spawnLocation.z + 2)
  if (chest === undefined) {
    console.warn("Could not load the position to place our chest.");
    return -1;
  }

  chest.setPermutation(BlockPermutation.resolve("chest"));
  
}

system.run(mainTick);
