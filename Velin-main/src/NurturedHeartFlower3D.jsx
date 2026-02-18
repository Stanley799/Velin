// NurturedHeartFlower3D.jsx
// Central, dynamic, non-verbal status display for Velin
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

// Utility: Map alignment score to color and pulse
function getVitalityProps(alignmentScore) {
  // Clamp score
  const score = Math.max(0, Math.min(100, alignmentScore));
  // Color: high = neon green/teal, low = gray/secondary
  const color = score > 80 ? '#0fffcf' : score < 60 ? '#888a8a' : '#3f8efc';
  // Pulse: high = slow/deep, low = fast/shallow
  const pulseSpeed = score > 80 ? 0.8 : score < 60 ? 2.2 : 1.2;
  const pulseDepth = score > 80 ? 0.18 : score < 60 ? 0.07 : 0.12;
  return { color, pulseSpeed, pulseDepth };
}

// Utility: Map Velin Tier to flower/tree complexity
function getMaturityProps(tier) {
  const t = Math.max(1, Math.min(5, tier));
  // Petal/layer count, stem thickness, scale
  return {
    petals: 6 + t * 4,
    layers: t,
    stemRadius: 0.08 + t * 0.04,
    scale: 0.7 + t * 0.18,
  };
}

export default function NurturedHeartFlower3D({ alignmentScore = 75, velinTier = 3, eventBurst = false }) {
  const mountRef = useRef();
  const burstRef = useRef(false);

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

    // Heart geometry (center)
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, 0.25);
    heartShape.bezierCurveTo(0, 0.5, 0.5, 0.7, 0.5, 0.25);
    heartShape.bezierCurveTo(0.5, -0.1, 0, -0.2, 0, -0.5);
    heartShape.bezierCurveTo(0, -0.2, -0.5, -0.1, -0.5, 0.25);
    heartShape.bezierCurveTo(-0.5, 0.7, 0, 0.5, 0, 0.25);
    const extrudeSettings = { depth: 0.18, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 0.08, bevelThickness: 0.08 };
    const heartGeom = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
    const { color, pulseSpeed, pulseDepth } = getVitalityProps(alignmentScore);
    const heartMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7, metalness: 0.6, roughness: 0.25 });
    const heartMesh = new THREE.Mesh(heartGeom, heartMat);
    heartMesh.position.set(0, 0.5, 0);
    scene.add(heartMesh);

    // Petals (arranged in layers)
    const { petals, layers, stemRadius, scale } = getMaturityProps(velinTier);
    const petalGeom = new THREE.SphereGeometry(0.22, 12, 8);
    for (let l = 0; l < layers; l++) {
      const layerRadius = 0.55 + l * 0.18;
      const layerY = 0.5 - l * 0.09;
      for (let i = 0; i < petals; i++) {
        const angle = (i / petals) * Math.PI * 2 + (l % 2) * (Math.PI / petals);
        const x = Math.cos(angle) * layerRadius;
        const y = layerY;
        const z = Math.sin(angle) * layerRadius;
        const petalMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 + l * 0.1, metalness: 0.5, roughness: 0.4 });
        const petal = new THREE.Mesh(petalGeom, petalMat);
        petal.position.set(x, y, z);
        petal.scale.set(1, 1.2 - l * 0.1, 1);
        scene.add(petal);
      }
    }

    // Stem
    const stemGeom = new THREE.CylinderGeometry(stemRadius, stemRadius * 0.85, 1.5 + layers * 0.2, 12);
    const stemMat = new THREE.MeshStandardMaterial({ color: '#1db954', emissive: '#0fffcf', emissiveIntensity: 0.18, metalness: 0.4, roughness: 0.7 });
    const stem = new THREE.Mesh(stemGeom, stemMat);
    stem.position.set(0, -0.5 - layers * 0.08, 0);
    scene.add(stem);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    mountNode.appendChild(renderer.domElement);

    // Animation state
    let t = 0;
    let burstAnim = 0;
    if (eventBurst) burstRef.current = true;

    // Animation loop
    let frameId;
    const animate = () => {
      t += 0.016 * pulseSpeed;
      // Heartbeat pulse
      const pulse = 1 + Math.sin(t * Math.PI * 2) * pulseDepth + (burstRef.current ? 0.25 : 0);
      heartMesh.scale.set(pulse * scale, pulse * scale, pulse * scale);
      // Petal glow burst
      scene.traverse(obj => {
        if (obj.isMesh && obj !== heartMesh && obj.material && obj.material.emissive) {
          obj.material.emissiveIntensity = 0.3 + (burstRef.current ? 0.7 : 0.1);
        }
      });
      // Burst feedback
      if (burstRef.current) {
        burstAnim += 0.04;
        if (burstAnim > 1) {
          burstRef.current = false;
          burstAnim = 0;
        }
      }
      // Continuous rotation
      scene.rotation.y += 0.005 + (alignmentScore < 60 ? 0.004 : 0);
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
  }, [alignmentScore, velinTier, eventBurst]);

  return <div ref={mountRef} style={{ width: '100%', height: 260, margin: '0 auto' }}></div>;
}
