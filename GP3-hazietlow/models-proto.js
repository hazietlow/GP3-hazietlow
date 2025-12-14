import * as T from "./CS559-Three/build/three.module.js";

export function createSnakeSegmentProto() {
    const geometry = new T.CylinderGeometry(0.4, 0.4, 1.0, 16);
    const material = new T.MeshStandardMaterial({ 
        color: 0x2ecc71, 
        flatShading: false 
    });
    
    const mesh = new T.Mesh(geometry, material);

    mesh.rotation.z = Math.PI / 2; 
    
    return mesh;
}

export function createFoodProto() {
    const geometry = new T.DodecahedronGeometry(0.5, 0); 
    
    const randomColor = new T.Color().setHSL(Math.random(), 0.8, 0.5);

    const material = new T.MeshStandardMaterial({ 
        color: randomColor,
        emissive: randomColor,
        emissiveIntensity: 1,
        flatShading: true 
    });
    
    return new T.Mesh(geometry, material);
}