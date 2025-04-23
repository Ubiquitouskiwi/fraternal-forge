import { world, system, BlockPermutation, EntityInventoryComponent, PlayerBreakBlockAfterEvent, PlayerPlaceBlockAfterEvent, PlayerPlaceBlockAfterEventSignal, BlockInventoryComponent, Vector3, BlockVolumeBase, ListBlockVolume, BlockVolume } from "@minecraft/server";
import { MinecraftBlockTypes, MinecraftDimensionTypes } from "@minecraft/vanilla-data";
import { checkServerIdentity } from "tls";

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
   // scanInventories();
    scanChests();
    //world.sendMessage(`Total Blocks In Economy. ${JSON.stringify(knownBlocks, null, 4)}`);
  }

  system.run(mainTick);
}

function scanChests() {
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
    let chests = worldDimension.getBlocks(searchVolume, {includeTypes: [MinecraftBlockTypes.Chest]}, true);
    //world.sendMessage(`Length of chest list: ${chests.getCapacity()}`)
    for (let chest of chests.getBlockLocationIterator()) {
      foundChests.push(chest);
      world.sendMessage(`Chest at location x:${chest.x}, y: ${chest.y}, z:${chest.z}`);
    }
  }

  world.sendMessage("Done scanning chests");
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

function playerPlaceBlockAfterCallback(event: PlayerPlaceBlockAfterEvent) {
  world.sendMessage("Block placed!");
  let placedBlock = event.block;
  if (placedBlock.typeId == MinecraftBlockTypes.Chest) {
    world.sendMessage("Chest placed!! Saving location for scanning.")
    chestLocations.push({ x: placedBlock.x, y: placedBlock.y, z: placedBlock.z});
    saveChestData(placedBlock.x, placedBlock.y,  placedBlock.z );
  }
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
 world.sendMessage("Getting saved data...");
 readChestData()
  world.sendMessage("End saved data retrieval...");
  world.afterEvents.playerPlaceBlock.subscribe(playerPlaceBlockAfterCallback)
  
}

system.run(mainTick);
