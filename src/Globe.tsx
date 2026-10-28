import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Landmark } from './types'

export interface Hover {
  landmark: Landmark
  x: number
  y: number
}

interface GlobeProps {
  landmarks: Landmark[]
  selected: Landmark
  hoveredId?: string
  diving: boolean
  resetSignal: number
  reduced: boolean
  onSelect: (l: Landmark, fromGlobe: boolean) => void
  onHover: (h: Hover | null) => void
  noWebgl: string
}

const CAMERA_HOME = 3.1
const MARKER_ALTITUDE = 1.012

// Matches three.js SphereGeometry UVs, where u = 0 is longitude -180°.
function toVector(lat: number, lng: number, r = 1) {
  const phi = ((lng + 180) * Math.PI) / 180
  const theta = (lat * Math.PI) / 180
  return new THREE.Vector3(-Math.cos(phi) * Math.cos(theta) * r, Math.sin(theta) * r, Math.sin(phi) * Math.cos(theta) * r)
}

// Rotation that brings (lat, lng) to face the camera on +Z while keeping north up.
function facing(lat: number, lng: number) {
  const phi = ((lng + 180) * Math.PI) / 180
  const tilt = THREE.MathUtils.clamp((lat * Math.PI) / 180, -1.05, 1.05)
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, Math.PI / 2 - phi, 0, 'XYZ'))
}

function Earth({ reduced }: { reduced: boolean }) {
  const [map, bump] = useTexture(['/textures/earth-blue-marble.jpg', '/textures/earth-topology.png'])
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace
    for (const t of [map, bump]) {
      t.anisotropy = Math.min(gl.capabilities.getMaxAnisotropy(), 8)
      t.needsUpdate = true
    }
  }, [map, bump, gl])
  const seg = reduced ? 96 : 160
  return (
    <>
      <mesh onPointerOver={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        <sphereGeometry args={[1, seg, seg / 2]} />
        <meshStandardMaterial map={map} bumpMap={bump} bumpScale={0.03} roughness={0.78} metalness={0.05} />
      </mesh>
      <Atmosphere />
    </>
  )
}

// Fresnel rim glow rendered on a slightly larger back-faced shell.
function Atmosphere() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        uniforms: { glow: { value: new THREE.Color('#6fb3dc') } },
        vertexShader: /* glsl */ `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 glow;
          varying vec3 vNormal;
          void main() {
            float i = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
            gl_FragColor = vec4(glow, 1.0) * i;
          }`,
      }),
    [],
  )
  return (
    <mesh scale={1.16} material={material}>
      <sphereGeometry args={[1, 64, 32]} />
    </mesh>
  )
}

function Markers({ landmarks, selected, hoveredId, onSelect, onHover }: Omit<GlobeProps, 'diving' | 'resetSignal' | 'reduced' | 'noWebgl'>) {
  const dot = useMemo(() => new THREE.SphereGeometry(0.009, 12, 10), [])
  const hit = useMemo(() => new THREE.SphereGeometry(0.028, 8, 8), [])
  const halo = useMemo(() => new THREE.RingGeometry(0.016, 0.022, 32), [])
  const pulse = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!pulse.current) return
    const t = (clock.elapsedTime % 1.8) / 1.8
    pulse.current.scale.setScalar(1 + t * 2.4)
    ;(pulse.current.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - t)
  })

  const hover = (l: Landmark) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onHover({ landmark: l, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })
    document.body.style.cursor = 'pointer'
  }

  return (
    <>
      {landmarks.map((l) => {
        const pos = toVector(l.lat, l.lng, MARKER_ALTITUDE)
        const isSel = l.id === selected.id
        const isHover = l.id === hoveredId
        return (
          <group key={l.id} position={pos} onUpdate={(g) => g.lookAt(pos.clone().multiplyScalar(2))}>
            <mesh
              geometry={hit}
              onPointerOver={hover(l)}
              onPointerMove={hover(l)}
              onPointerOut={(e) => {
                e.stopPropagation()
                onHover(null)
                document.body.style.cursor = ''
              }}
              onClick={(e) => {
                e.stopPropagation()
                document.body.style.cursor = ''
                onSelect(l, true)
              }}
            >
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <mesh geometry={dot} scale={isSel ? 1.8 : isHover ? 1.4 : 1}>
              <meshBasicMaterial color={isSel ? '#ffd27a' : isHover ? '#f6e6bf' : '#d9a94f'} toneMapped={false} />
            </mesh>
            {(isSel || isHover) && (
              <mesh geometry={halo} scale={isSel ? 1.6 : 1.2}>
                <meshBasicMaterial color={isSel ? '#ffd27a' : '#7cc0e4'} transparent opacity={0.8} side={THREE.DoubleSide} toneMapped={false} />
              </mesh>
            )}
            {isSel && (
              <mesh ref={pulse} geometry={halo}>
                <meshBasicMaterial color="#ffd27a" transparent side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
              </mesh>
            )}
          </group>
        )
      })}
    </>
  )
}

function SpinningEarth(props: GlobeProps) {
  const group = useRef<THREE.Group>(null)
  const goal = useMemo(() => facing(props.selected.lat, props.selected.lng), [props.selected.lat, props.selected.lng])

  useFrame((_, dt) => {
    const g = group.current
    if (!g || g.quaternion.angleTo(goal) < 1e-4) return
    g.quaternion.slerp(goal, 1 - Math.exp(-(props.diving ? 4.5 : 2.4) * dt))
  })

  return (
    <group ref={group}>
      <Earth reduced={props.reduced} />
      <Markers {...props} />
    </group>
  )
}

// Owns the camera when something other than the user should be moving it.
function CameraRig({ diving, resetSignal, controls }: { diving: boolean; resetSignal: number; controls: React.RefObject<OrbitControlsImpl | null> }) {
  const camera = useThree((s) => s.camera)
  const target = useRef<THREE.Vector3 | null>(null)

  useEffect(() => {
    target.current = new THREE.Vector3(0, 0, CAMERA_HOME)
  }, [resetSignal])

  useEffect(() => {
    if (diving) target.current = new THREE.Vector3(0, 0, 1.18)
  }, [diving])

  useFrame((_, dt) => {
    if (!target.current) return
    camera.position.lerp(target.current, 1 - Math.exp(-(diving ? 3.2 : 3.8) * dt))
    camera.lookAt(0, 0, 0)
    controls.current?.update()
    if (camera.position.distanceTo(target.current) < 1e-3) target.current = null
  })
  return null
}

export default function Globe(props: GlobeProps) {
  const controls = useRef<OrbitControlsImpl>(null)
  return (
    <Canvas
      camera={{ position: [0, 0, CAMERA_HOME], fov: 42, near: 0.05 }}
      dpr={props.reduced ? [1, 1.4] : [1, 2]}
      gl={{ antialias: true }}
      fallback={<div className="webgl-fallback">{props.noWebgl}</div>}
    >
      <color attach="background" args={['#05080c']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 2.5, 4]} intensity={2.2} color="#fff1d6" />
      <pointLight position={[-4, -2, 2]} intensity={1.4} color="#7cc0e4" />
      <Stars radius={90} depth={50} count={props.reduced ? 1200 : 3000} factor={3.5} saturation={0} fade speed={0.4} />
      <Suspense fallback={null}>
        <SpinningEarth {...props} />
      </Suspense>
      <CameraRig diving={props.diving} resetSignal={props.resetSignal} controls={controls} />
      <OrbitControls
        ref={controls}
        enabled={!props.diving}
        enablePan={false}
        enableDamping
        rotateSpeed={0.45}
        zoomSpeed={0.6}
        minDistance={1.6}
        maxDistance={4.6}
        minPolarAngle={Math.PI * 0.12}
        maxPolarAngle={Math.PI * 0.88}
      />
    </Canvas>
  )
}
