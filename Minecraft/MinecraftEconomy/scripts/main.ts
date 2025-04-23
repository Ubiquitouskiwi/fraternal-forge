import { world, system, BlockPermutation, EntityInventoryComponent, PlayerBreakBlockAfterEvent, PlayerPlaceBlockAfterEvent, PlayerPlaceBlockAfterEventSignal, BlockInventoryComponent, Vector3, BlockVolumeBase, ListBlockVolume, BlockVolume } from "@minecraft/server";
import { MinecraftBlockTypes, MinecraftDimensionTypes } from "@minecraft/vanilla-data";
import { checkServerIdentity } from "tls";
import { arrayUnique } from "./helpers/Utilities";

const ADDON_DEBUG = false;

let ticksSinceLoad = 0;
let economy: {[id: string]: number} = {};
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
    let currentEconomy: { [id: string]: number } = {};

    // Find and scan chests
    findChests()
    let chestItems = scanChests();
    for (let item of chestItems) {
      let modType = item.replace("minecraft:", "");

      if (!(modType in economy)) {
        currentEconomy[modType] = 1;
      } else {
        currentEconomy[modType] += 1;
      }
    }

    // Scan players inventories
    let playerInventoryItems = scanInventories();
    for (let invItem in playerInventoryItems) {
      if (!(invItem in currentEconomy)) {
        currentEconomy[invItem] = playerInventoryItems[invItem];
      } else {
        currentEconomy[invItem] += playerInventoryItems[invItem];
      }
    }
    economy = currentEconomy;
    world.sendMessage(`Total Blocks In Economy. ${JSON.stringify(currentEconomy, null, 4)}`);
  }

  system.run(mainTick);
}

function findChests() {
  let worldDimension = world.getDimension("overworld");
  // get players' location in order to calculate search radius
  let players = world.getAllPlayers();
  let foundChests = [];

  for (let player of players) {
    let searchVolumeTo = { x: player.location.x - 500, y: worldDimension.heightRange.min, z: player.location.z - 500 };
    //world.sendMessage(`TO: ${JSON.stringify(searchVolumeTo, null, 4)}`);
    let searchVolumeFrom = { x: player.location.x + 500, y: worldDimension.heightRange.max, z: player.location.z + 500 };
    //world.sendMessage(`FROM: ${JSON.stringify(searchVolumeFrom, null, 4)}`);
    let searchVolume = new BlockVolume(searchVolumeFrom, searchVolumeTo);
    //world.sendMessage(`BLOCK VOLUME: ${JSON.stringify(searchVolume, null, 4)}`);
    let chests = worldDimension.getBlocks(searchVolume, { includeTypes: [MinecraftBlockTypes.Chest], }, true);
    //world.sendMessage(`Length of chest list: ${chests.getCapacity()}`)
    for (let chest of chests.getBlockLocationIterator()) {
      foundChests.push(chest);
      
    }
  }
  let tempArray = chestLocations.concat(foundChests);
  chestLocations = arrayUnique(tempArray);
  if (ADDON_DEBUG) {
    world.sendMessage(`Chest found during scan: ${JSON.stringify(chestLocations, null, 4)}`);
  }
  
}

function scanChests() {
  let overworld = world.getDimension("overworld");
  let chestBlocks = [];
  for (let chest of chestLocations) {
    let chestBlock = overworld.getBlock(chest);
    if (chestBlock !== undefined) {
      let chestInventory = chestBlock.getComponent("inventory");
      if (chestInventory !== undefined) {
        let chestContainer = chestInventory.container;
        if (chestContainer !== undefined) {
          for (let i = 0; i < chestContainer.size; i++) {
            let inventoryItem = chestContainer.getItem(i);
            if (inventoryItem !== undefined) {
              chestBlocks.push(inventoryItem.typeId.replace("minecraft:", ""));
            } else {
              if (ADDON_DEBUG) {
                world.sendMessage(`inventoryItem is null. chestContainer: ${JSON.stringify(inventoryItem, null, 4)}`);
              }
              
            }
          }
        } else {
          if (ADDON_DEBUG) {
            world.sendMessage(`chestContainer is null. chestContainer: ${JSON.stringify(chestContainer, null, 4)}`);
          }
          
        }
      } else {
        if (ADDON_DEBUG) {
          world.sendMessage(`chestInventory is null. chestInventory: ${JSON.stringify(chestInventory, null, 4)}`);
        }
        
      }
    } else {
      if (ADDON_DEBUG) {
        world.sendMessage(`chestBlock is null. chest: ${JSON.stringify(chest, null, 4)}`);
      }
      
    }

    world.sendMessage(`Blocks in current economy: ${JSON.stringify(chestBlocks, null, 4)}`);
  }
  
  if (ADDON_DEBUG) {
    world.sendMessage("Done scanning chests");
  }
  
  return chestBlocks;
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
    
    return updatedKnownBlocks;
  }
}

function playerPlaceBlockAfterCallback(event: PlayerPlaceBlockAfterEvent) {
  world.sendMessage("Block placed!");
}

function saveChestData(x: number, y: number, z: number) {
  let savedChestData = readSaveData("chest-location");
  if (savedChestData !== undefined) {
    try {
      let chestData = <Vector3[]> JSON.parse(savedChestData as string);
      let locationObj = {x: x, y: y, z: z};

      if (!chestData.includes(locationObj)) {
        chestData.push(locationObj);
        saveData("chest-location", JSON.stringify(chestData));
      } 
    } catch (error) {
      console.error(error);
    }
  }
}

function readChestData() {
  let savedChestData = world.getDynamicProperty("chest-location");

  if (savedChestData !== undefined) {
    try {
      let chests = JSON.parse(savedChestData as string);

      chestLocations = chests;
    } catch (error) {
      console.error(error);
    }
  }
}

function readSaveData(key: string) {
  return world.getDynamicProperty(`minecraft-economy:${key}`);
}

function saveData(key: string, data: string) {
  world.setDynamicProperty(`minecraft-economy:${key}`, data);
}

function initialize() {
  // Load local data if any
 // chestLocations = readSaveData("chestLocations.json");

  world.afterEvents.playerPlaceBlock.subscribe(playerPlaceBlockAfterCallback)
  
}

system.run(mainTick);
