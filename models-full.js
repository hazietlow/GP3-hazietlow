import * as T from "./CS559-Three/build/three.module.js";
import { OBJLoader } from "./CS559-Three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "./CS559-Three/examples/jsm/loaders/MTLLoader.js";

/*
 * The fruits are free 3D models from as listed below:
 * melon: https://free3d.com/3d-model/fruit-v1--154643.html
 * orange: https://free3d.com/3d-model/fruit-v1--195897.html
 * peach: https://free3d.com/3d-model/fruit-v1--559105.html
 * strawberry: https://free3d.com/3d-model/strawberry--577660.html
 * watermelon: https://free3d.com/3d-model/watermelon-v1--305655.html
 */ 
const fruitLibrary = {};
const fruitNames = ["melon", "orange", "peach", "strawberry", "watermelon"];

fruitNames.forEach(name => {
    loadOBJWithMTL(name, (loadedGroup) => {
        fruitLibrary[name] = loadedGroup;
    });
});

const loader = new T.TextureLoader();

const snakeTexture = loader.load("./snakeScales.png");

export function createSnakeSegmentFull() {
    const geometry = new T.CylinderGeometry(0.5, 0.5, 0.9, 12);
    
    snakeTexture.wrapS = T.RepeatWrapping;
    snakeTexture.wrapT = T.RepeatWrapping;

    const material = new T.MeshStandardMaterial({ 
        map: snakeTexture,
        color: 0x2e7d32, 
        roughness: 0.4 
    });
    
    const segment = new T.Mesh(geometry, material);
    segment.rotation.x = Math.PI / 2; 
    return segment;
}

function normalizeModelSize(object, targetSize = 0.8) {
    const box = new T.Box3().setFromObject(object);
    const center = new T.Vector3();
    box.getCenter(center);
    
    object.children.forEach(child => {
        child.position.sub(center);
    });

    const size = new T.Vector3();
    box.getSize(size);
    const maxAxis = Math.max(size.x, size.y, size.z);
    const scale = targetSize / maxAxis;
    object.scale.setScalar(scale);

    return object;
}

export function createFoodFull() {
    const randomName = fruitNames[Math.floor(Math.random() * fruitNames.length)];
    const original = fruitLibrary[randomName];

    if (original) {
        const clone = original.clone(true);
        return normalizeModelSize(clone, 0.8);
    } else {
        const geometry = new T.SphereGeometry(0.4);
        const material = new T.MeshStandardMaterial({ color: 0xff0000 });
        return new T.Mesh(geometry, material);
    }
}


function loadOBJWithMTL(modelName, callback) {
    const mtlLoader = new MTLLoader();
    
    mtlLoader.setResourcePath('./fruits/'); 
    mtlLoader.setPath('./fruits/');

    mtlLoader.load(
        `${modelName}.mtl`,
        (materialCreator) => {
            materialCreator.preload();
            
            const objLoader = new OBJLoader(); 
            objLoader.setPath('./fruits/');
            
            objLoader.setMaterials(materialCreator); 

            objLoader.load(
                `${modelName}.obj`,
                (group) => {
                    callback(group);
                },
                undefined, 
                (error) => {
                    console.error(`Error loading OBJ for ${modelName}:`, error);
                }
            );
        },
        undefined, 
        (error) => {
            console.warn(`Error loading MTL for ${modelName}. Attempting to load OBJ without materials.`, error);
            const objLoader = new OBJLoader();
            objLoader.setPath('./fruits/');
            objLoader.load(`${modelName}.obj`, callback);
        }
    );
}