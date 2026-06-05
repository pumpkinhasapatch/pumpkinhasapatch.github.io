import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.156/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.156/examples/jsm/loaders/GLTFLoader.js';

let scene, camera, renderer, clock;
let model = null;
const lerpSpeed = 8.0; // rotation responsiveness

init();
animate();

function init() {
  scene = new THREE.Scene();
  clock = new THREE.Clock();

  camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1000);
  camera.position.set(0, 1.5, 4);
  
  const canvas = document.querySelector('#c');
  renderer = new THREE.WebGLRenderer({ antialias: true, canvas, alpha: true });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 7.5);
  scene.add(dir);

  // Load model (replace URL)
  const loader = new GLTFLoader();
  loader.load(
    'img/pumpkin3d.gltf',
    (gltf) => {
      model = gltf.scene;

      // Position model
      model.position.set(0, 0.75, 0);
      scene.add(model);
    },
    undefined,
    (err) => console.error(err)
  );

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('resize', onWindowResize);
}

const radius = 100;
const detail = 3;
const geometry = new THREE.OctahedronGeometry( radius, detail );

const loader = new THREE.TextureLoader();
const texture = loader.load( 'img/background_space.jpg' );
texture.colorSpace = THREE.SRGBColorSpace;
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
  
const material = new THREE.MeshBasicMaterial({
  map: texture,
  side: THREE.BackSide,
});

const skybox = new THREE.Mesh( geometry, material );
scene.add( skybox );

// Mouse NDC
const mouseNDC = new THREE.Vector2(0,0);
// Raycaster
const raycaster = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const intersectPoint = new THREE.Vector3();

function onMouseMove(e){
  mouseNDC.x = (e.clientX / innerWidth) * 2 - 1;
  mouseNDC.y = -(e.clientY / innerHeight) * 2 + 1;
}

function onWindowResize(){
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

const targetQuat = new THREE.Quaternion();
const flipXQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), Math.PI); // if needed
const tmpMat = new THREE.Matrix4();

function animate(time){
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  if (model) {
    // Ray from camera through mouse to intersect a plane in front of camera to get a 3D target.
    // Use a plane positioned a bit in front of camera so mouse projects into scene volume.
    raycaster.setFromCamera(mouseNDC, camera);

    // Option A: intersect ground plane at y=0 (useful if model near ground)
    const hit = raycaster.ray.intersectPlane(plane, intersectPoint);

    // If no hit (mouse aiming up/down beyond plane), fallback to a point at fixed distance along the ray
    if (!hit) {
      raycaster.ray.at(20, intersectPoint); // 20 units out
    }

    // Compute direction from model to target in world space
    const modelPos = new THREE.Vector3();
    model.getWorldPosition(modelPos);

    // Direction vector (allow full 3D rotation: do NOT clamp Y)
    const dir = new THREE.Vector3().subVectors(intersectPoint, modelPos).normalize();
    if (dir.lengthSq() > 0) {
      // get current world quaternion
      const currentQ = model.quaternion.clone();

      // create a temporary object to use lookAt without modifying model immediately
      const tmp = new THREE.Object3D();
      tmp.position.copy(modelPos);
      tmp.lookAt(intersectPoint);

      // reverse direction:
      const flip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), Math.PI);
      tmp.quaternion.multiply(flip);

      model.quaternion.slerp(tmp.quaternion, 1 - Math.exp(-lerpSpeed * dt));
    }
      
    skybox.rotation.x = time / 200000;
    skybox.rotation.y = time / 100000;
  }

  renderer.render(scene, camera);
}