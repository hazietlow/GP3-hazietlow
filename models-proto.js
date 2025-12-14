import * as T from "./CS559-Three/build/three.module.js";

/**
 * PROTO MODE: Snake Segment
 * Now using a Cylinder to create a "long pipe" look.
 */
export function createSnakeSegmentProto() {
    // Radius top, Radius bottom, Height, Radial segments
    // Height is 1.0 to ensure segments touch perfectly
    const geometry = new T.CylinderGeometry(0.4, 0.4, 1.0, 16);
    const material = new T.MeshStandardMaterial({ 
        color: 0x2ecc71, // Nice Emerald Green
        flatShading: false 
    });
    
    const mesh = new T.Mesh(geometry, material);

    /** * IMPORTANT: By default, cylinders are vertical (Y-axis).
     * We rotate it 90 degrees on the Z-axis so it lays flat.
     * In your game logic, the "forward" movement is on X and Z.
     */
    mesh.rotation.z = Math.PI / 2; 
    
    return mesh;
}

/**
 * PROTO MODE: Food
 * A simple 12-sided sphere (Dodecahedron) for a "low-poly" fruit look.
 */
export function createFoodProto() {
    const geometry = new T.DodecahedronGeometry(0.5, 0); 
    
    // Generate a random color using Three.js Color object
    // This picks a random Hue, with high Saturation and Lightness for "fruit" vibes
    const randomColor = new T.Color().setHSL(Math.random(), 0.8, 0.5);

    const material = new T.MeshStandardMaterial({ 
        color: randomColor,
        emissive: randomColor,
        emissiveIntensity: 1,
        flatShading: true 
    });
    
    return new T.Mesh(geometry, material);
}