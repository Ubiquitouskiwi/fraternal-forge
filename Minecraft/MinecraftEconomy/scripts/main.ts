import { world, system, BlockPermutation, EntityInventoryComponent, PlayerBreakBlockAfterEvent, PlayerPlaceBlockAfterEvent, PlayerPlaceBlockAfterEventSignal, BlockInventoryComponent } from "@minecraft/server";
import { MinecraftBlockTypes, MinecraftDimensionTypes } from "@minecraft/vanilla-data";

let ticksSinceLoad = 0;
let knownBlocks: {[id: string]: number} = {};
let chestLocations: {x: number, y: number, z: number}[] = [];

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
    scanChests();
    world.sendMessage(`Total Blocks In Economy. ${JSON.stringify(knownBlocks, null, 4)}`);
  }

  system.run(mainTick);
}

function scanChests() {
  let overworld = world.getDimension("overworld");
  for (let location of chestLocations) {
    let chestBlock = overworld.getBlock(location);
    if (chestBlock != undefined) {
      let chestInventory = chestBlock.getComponent("inventory");
      if  (chestInventory != undefined) {
        let chestInv = chestInventory as BlockInventoryComponent;
        if (chestInv.container != undefined) {
          for (let i = 0; i < chestInv.container.size; i++) {
            let item = chestInv.container.getItem(i);
            if (item != undefined) {
              let modKey = item.typeId.replace("minecraft:", "");
              if (!(modKey in knownBlocks)) {
                knownBlocks[modKey] = item.amount;
              } else {
                knownBlocks[modKey] += item.amount;
              }
            }
            
          }
        }
        
      }
    }
    
  }
}

function scanInventories() {
  let players = world.getPlayers();
  for (let player of players) {
    let updatedKnownBlocks: { [id: string]: number } = {};
    let playerInventory = player.getComponent("inventory") as EntityInventoryComponent;
    let invContainer = playerInventory.container;
    if (invContainer !== undefined) {
      for (let i = 0; i < invContainer.size; i++) {
        let invItem = invContainer.getItem(i);

        if (invItem !== undefined) {
          let keyMod = invItem.typeId.replace("minecraft:", "");
          if (!(keyMod in updatedKnownBlocks)) {
            
            updatedKnownBlocks[keyMod] = invItem.amount;
          } else {
            updatedKnownBlocks[keyMod] += invItem.amount;
          }
        }
      }
    }
    
    knownBlocks = updatedKnownBlocks;
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

function playerPlaceBlockAfterCallback(event: PlayerPlaceBlockAfterEvent) {
  world.sendMessage("Block placed!");
  let placedBlock = event.block.typeId.replace("minecraft:", "");
  if (placedBlock == "chest") {
    world.sendMessage("Chest placed!! Saving location for scanning.")
    chestLocations.push({x: event.block.x, y: event.block.y, z: event.block.z});
  }
}

function initialize() {
  // const overworld = world.getDimension("overworld");

  // const spawnLocation = world.getDefaultSpawnLocation();
  
  // const chest = overworld.getBlock({x: spawnLocation.x + 2, z: spawnLocation.z + 2 , y: findTopmostBlockUsingPlayer(spawnLocation.x + 2, spawnLocation.z + 2)});

  // world.sendMessage("Adding chest at x:" + spawnLocation.x + 2 + " y:" + findTopmostBlockUsingPlayer(spawnLocation.x + 2, spawnLocation.z + 2) + " z:" + spawnLocation.z + 2)
  // if (chest === undefined) {
  //   console.warn("Could not load the position to place our chest.");
  //   return -1;
  // }

  // chest.setPermutation(BlockPermutation.resolve("chest"));
  world.afterEvents.playerPlaceBlock.subscribe(playerPlaceBlockAfterCallback)
  
}

system.run(mainTick);
