// RelationshipHeart3D.jsx
// Anatomically-inspired 3D heart with dynamic color, glow, and pulse based on alignmentScore
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

function getHeartMaterialProps(alignmentScore) {
  // Clamp score
  const score = Math.max(0, Math.min(100, alignmentScore));
  let color, emissive, emissiveIntensity;
  if (score > 80) {
    color = '#b71c1c'; // deep red
    emissive = '#ff1744';
    emissiveIntensity = 1.1;
  } else if (score < 60) {
    color = '#8d6e63'; // pale/dull brownish red
    emissive = '#5d4037';
    emissiveIntensity = 0.18;
  } else {
    color = '#c62828'; // normal red
    emissive = '#ad1457';
    emissiveIntensity = 0.5;
  }
  return { color, emissive, emissiveIntensity };
}

function getPulseProps(alignmentScore) {
  // High = slow, deep; Low = fast, shallow, erratic
  const score = Math.max(0, Math.min(100, alignmentScore));
  let freq, depth;
  if (score > 80) {
    freq = 0.7; // slow
    depth = 0.18; // deep
  } else if (score < 60) {
    freq = 2.1; // fast
    depth = 0.07; // shallow
  } else {
    freq = 1.2; // normal
    depth = 0.12;
  }
  return { freq, depth };
}

// Simple stylized heart shape (replace with GLTF for full realism)
function createHeartMesh(material) {
  // Parametric heart shape
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, 0.25);
  heartShape.bezierCurveTo(0, 0.5, 0.5, 0.7, 0.5, 0.25);
  heartShape.bezierCurveTo(0.5, -0.1, 0, -0.2, 0, -0.5);
  heartShape.bezierCurveTo(0, -0.2, -0.5, -0.1, -0.5, 0.25);
  heartShape.bezierCurveTo(-0.5, 0.7, 0, 0.5, 0, 0.25);
  const extrudeSettings = { depth: 0.18, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 0.08, bevelThickness: 0.08 };
  const geometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 0.5, 0);
  return mesh;
}

export default function RelationshipHeart3D({ alignmentScore = 75 }) {
  const mountRef = useRef();

  useEffect(() => {
    const mountNode = mountRef.current;
    const width = mountNode.clientWidth;
    const height = 260;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 4.5;

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(2, 4, 6);
    scene.add(dirLight);

    // Heart
    const { color, emissive, emissiveIntensity } = getHeartMaterialProps(alignmentScore);
    const material = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity, metalness: 0.6, roughness: 0.25 });
    const heartMesh = createHeartMesh(material);
    scene.add(heartMesh);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    mountNode.appendChild(renderer.domElement);

    // Animation state
    let t = 0;
    const { freq, depth } = getPulseProps(alignmentScore);
    let frameId;
    const animate = () => {
      t += 0.016 * freq;
      // Heartbeat pulse
      const pulse = 1 + Math.sin(t * Math.PI * 2) * depth;
      heartMesh.scale.set(pulse, pulse, pulse);
      // Slight erratic pulse for low score
      if (alignmentScore < 60) {
        heartMesh.rotation.z = Math.sin(t * 7) * 0.04;
      } else {
        heartMesh.rotation.z = 0;
      }
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      if (mountNode && renderer.domElement && renderer.domElement.parentNode === mountNode) {
        mountNode.removeChild(renderer.domElement);
      }
    };
  }, [alignmentScore]);

  return <div ref={mountRef} style={{ width: '100%', height: 260, margin: '0 auto' }}></div>;
}
