// Dashboard3D.jsx
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function Dashboard3D({ level = 1, xp = 0 }) {
  const mountRef = useRef();

  useEffect(() => {
    const mountNode = mountRef.current;
    const width = mountNode.clientWidth;
    const height = 180;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    mountNode.appendChild(renderer.domElement);

    // Growth Core: animated glowing crystal
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const color = new THREE.Color().setHSL((level * 0.1) % 1, 0.7, 0.6);
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.7, emissive: color, emissiveIntensity: 0.5 });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Lighting
    const light = new THREE.PointLight(color, 1.5, 10);
    light.position.set(2, 2, 3);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    let frameId;
    const animate = () => {
      mesh.rotation.x += 0.01 + xp * 0.0001;
      mesh.rotation.y += 0.012 + level * 0.001;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      if (
        mountNode &&
        renderer.domElement &&
        renderer.domElement.parentNode === mountNode
      ) {
        mountNode.removeChild(renderer.domElement);
      }
    };
  }, [level, xp]);

  return (<div ref={mountRef} style={{ width: '100%', height: 180, margin: '0 auto' }}></div>);
}
