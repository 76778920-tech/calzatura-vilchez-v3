import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PresentationControls, Stage, useGLTF } from "@react-three/drei";

function Model(props: Record<string, unknown>) {
  const { scene } = useGLTF("/girasol_vilchez.glb");
  return <primitive object={scene} {...props} />;
}

function FallbackSunflower() {
  return (
    <group>
      {Array.from({ length: 14 }).map((_, index) => {
        const angle = (index / 14) * Math.PI * 2;
        return (
          <mesh key={index} position={[Math.cos(angle) * 1.15, Math.sin(angle) * 1.15, 0]} rotation={[0, 0, angle]}>
            <sphereGeometry args={[0.28, 24, 24]} />
            <meshStandardMaterial color="#E8C96D" roughness={0.6} metalness={0.05} />
          </mesh>
        );
      })}
      <mesh>
        <sphereGeometry args={[0.65, 32, 32]} />
        <meshStandardMaterial color="#3C240B" roughness={0.9} metalness={0.02} />
      </mesh>
      <mesh position={[0, -1.6, 0]}>
        <cylinderGeometry args={[0.08, 0.11, 2.4, 18]} />
        <meshStandardMaterial color="#2E7D32" roughness={0.8} />
      </mesh>
    </group>
  );
}

export default function Logo3DPage() {
  const [hasGlb, setHasGlb] = useState(false);

  useEffect(() => {
    fetch("/girasol_vilchez.glb", { method: "HEAD" })
      .then((response) => {
        const contentType = response.headers.get("content-type") ?? "";
        const looksLikeModel = contentType.includes("model") || contentType.includes("octet-stream");
        setHasGlb(response.ok && looksLikeModel);
      })
      .catch(() => setHasGlb(false));
  }, []);

  return (
    <main style={{ minHeight: "calc(100vh - 180px)", padding: "1.25rem 1rem 2rem", background: "var(--bg)" }}>
      <section
        style={{
          margin: "0 auto",
          maxWidth: "980px",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          overflow: "hidden",
          background: "var(--white)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ padding: "0.9rem 1rem", borderBottom: "1px solid var(--border)" }}>
          <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Preview Logo 3D</h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Ruta de prueba: /logo-3d-preview
          </p>
        </div>

        <div style={{ height: "70vh", minHeight: "460px" }}>
          <Canvas dpr={[1, 2]} camera={{ fov: 45, position: [0, 0, 8] }}>
            <color attach="background" args={["#ffffff"]} />
            <ambientLight intensity={0.5} />
            <PresentationControls speed={1.5} global zoom={0.65} polar={[-0.1, Math.PI / 4]}>
              <Stage environment="city" intensity={0.7}>
                <Suspense fallback={<FallbackSunflower />}>
                  {hasGlb ? <Model scale={0.01} /> : <FallbackSunflower />}
                </Suspense>
              </Stage>
            </PresentationControls>
          </Canvas>
        </div>
      </section>
    </main>
  );
}
