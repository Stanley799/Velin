// RelationshipHeartGLTF3D.jsx
// Loads and animates a realistic GLTF heart model with pulse and glow based on alignmentScore

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';




export default function RelationshipHeartGLTF3D({ progress = 0 }) {
  const mountRef = useRef();
  const [error, setError] = React.useState(null);

  useEffect(() => {
    const mountNode = mountRef.current;
    const width = mountNode.clientWidth;
    const height = 260;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 4.5;

    // Lighting
    // Improved lighting: ambient + soft point + directional
    const ambient = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(2, 4, 6);
    dirLight.castShadow = false;
    scene.add(dirLight);
    // Add a soft point light for depth and highlight
    const pointLight = new THREE.PointLight(0xffe0e0, 0.7, 10);
    pointLight.position.set(0, 2, 3);
    scene.add(pointLight);



    // Load GLTF heart model
    const loader = new GLTFLoader();

    let heartMesh = null;
    let frameId;
    let t = 0;
    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    mountNode.appendChild(renderer.domElement);

    // Animation loop (only starts after model is loaded)
    function animate() {
      t += 0.016 * 1.1; // gentle heartbeat
      if (heartMesh) {
        const pulse = 1 + Math.sin(t * Math.PI * 2) * 0.045;
        heartMesh.scale.setScalar((2.3 / Math.max(...heartMesh.scale.toArray())) * pulse);
      }
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }

    loader.load(
      '/secondHeart/scene.gltf',
      (gltf) => {
        heartMesh = gltf.scene;
        // Remove/hide the 'Marble' mesh (Object_11) if present
        heartMesh.traverse((child) => {
          if (child.isMesh && (child.name === 'Object_11' || child.name === 'Marble' || child.material?.name === 'Marble')) {
            child.visible = false;
          }
        });
        // Center and scale the model to fit the view
        const box = new THREE.Box3().setFromObject(heartMesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);
        // Move to center
        heartMesh.position.x -= center.x;
        heartMesh.position.y -= center.y;
        heartMesh.position.z -= center.z;
        // Scale to fit (make heart larger by increasing desiredSize)
        const maxDim = Math.max(size.x, size.y, size.z);
        const desiredSize = 2.3;
        const scale = desiredSize / maxDim;
        heartMesh.scale.set(scale, scale, scale);
        scene.add(heartMesh);
        // Start animation only after model is ready
        animate();
      },
      undefined,
      (error) => {
        setError('Failed to load heart model: ' + error.message);
        console.error('Error loading heart model:', error);
      }
    );

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      renderer.dispose();
      if (mountNode && renderer.domElement && renderer.domElement.parentNode === mountNode) {
        mountNode.removeChild(renderer.domElement);
      }
    };
  }, [progress]);

  return (
    <div style={{ width: '100%', height: 260, margin: '0 auto', position: 'relative' }}>
      <div ref={mountRef} style={{ width: '100%', height: 260 }}></div>
      {error && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, color: 'red', background: '#fff8', fontWeight: 700, padding: 8, textAlign: 'center', zIndex: 2 }}>
          {error}
        </div>
      )}
    </div>
  );
}
