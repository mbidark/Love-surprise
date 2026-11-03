import * as THREE from 'three';

    /* ============================================================
       CONFIG
    ============================================================ */
    const CONFIG = {
      heartbeatSpeed: 1.15,
      particleCount: 1800,
      ambientParticleCount: 420,
      maxPixelRatio: 2,
      dragSensitivity: 0.007,
      inertiaDamping: 0.94,
      tapMaxDuration: 320,
      tapMaxDistance: 14,
      zoomMin: 0.55,
      zoomMax: 2.3,
    };

    const LOVE_PHRASES = [
      'I LOVE YOU', 'SINU', 'FOREVER WITH YOU', 'MY SUNSHINE',
      'CUTEST GIRL', 'MY HEART', 'ONLY YOU', 'MY LOVE',
      'I LOVE SINU', 'YOU + ME', 'MINE FOREVER', 'MY EVERYTHING',
      'MY FAVORITE PERSON', 'ALWAYS YOU', 'STAY WITH ME',
      'YOU MAKE LIFE BEAUTIFUL', 'MY PEACE', 'MY HAPPINESS',
      'EVERY HEARTBEAT SINU', 'SINU IS HOME', 'MY DREAM GIRL',
      'YOU ARE MY UNIVERSE', 'BEAUTIFUL SOUL', 'MY SAFE PLACE',
      'TOGETHER FOREVER', 'SINU ♡', 'MY SWEETEST SINU',
      'YOU ARE MAGIC', 'LOVE YOU MORE', 'MY ONE AND ONLY',
      'YOUR SMILE, MY WORLD', 'MY ANGEL', 'MY LITTLE STAR',
      'CUTE FOREVER', 'YOU COMPLETE ME', 'TE AMO',
      'HAPPY WITH YOU', 'MY FOREVER PERSON', 'SINU, MY LOVE',
      'YOU ARE WORTH IT ALL', 'MY HEARTBEAT', 'SO LUCKY WITH YOU',
      'MY PRINCESS', 'MY CUTE GIRL', 'SWEETEST SMILE',
      'YOU LIVE IN MY HEART', 'LOVE, SINU', 'MADE FOR YOU',
      'YOU + ME = FOREVER', 'MY MOONLIGHT', 'MY RAINBOW',
      'MY SECRET HAPPINESS', 'ONE LIFE, ONE LOVE', 'YOU ARE ENOUGH',
      'BEST FEELING IS YOU', 'AMAR SINU', 'TUMI AMAR PRIO',
      'TUMI AMAR SHANTI', 'CHIROKAL TOMAY', 'PROTI DINO TOMAY'
    ];

    /* ============================================================
       DOM REFS
    ============================================================ */
    const logoLayer   = document.getElementById('logo-layer');
    const logoFlash   = document.getElementById('logo-flash');
    const matrixLayer = document.getElementById('matrix-layer');
    const matrixCanvas= document.getElementById('matrix-canvas');
    const loveText    = document.getElementById('love-text');
    const letterOverlay = document.getElementById('letter-overlay');
    const closeBtn    = document.getElementById('close-letter');
    const canvasContainer = document.getElementById('canvas-container');
    const fallback2d  = document.getElementById('fallback-2d');
    const hintText    = document.getElementById('hint-text');
    const loveIdentity = document.querySelector('.love-identity');
    const soundToggle = document.getElementById('sound-toggle');
    const secretStar  = document.getElementById('secret-star');
    const secretNote  = document.getElementById('secret-note');
    const roseBurst   = document.getElementById('rose-burst');
    const holdBloom   = document.getElementById('hold-bloom');

    /* ============================================================
       STATE
    ============================================================ */
    let scene, camera, renderer;
    let heartGroup, heartMesh, heartInner, heartHighlight;
    let particleSystem, ambientParticles, textParticles;
    const clock = new THREE.Clock();

    let isDragging = false;
    let previousPointer = { x: 0, y: 0 };
    let rotationVelocity = { x: 0, y: 0 };
    let targetRotation   = { x: -0.05, y: 0.2 };
    let currentRotation  = { x: -0.05, y: 0.2 };
    let targetZoom  = 1;
    let currentZoom = 1;

    let tapCandidate = false;
    let tapStartTime = 0;
    let tapStartPos  = { x: 0, y: 0 };

    let letterVisible = false;
    let animationFrameId = null;
    let matrixAnimationId = null;
    let introFinished = false;
    let webglOK = true;
    let heartbeatPhase = 0;
    let hintDismissed = false;
    let audioContext = null;
    let soundEnabled = false;
    let musicEnabled = false;
    let masterVolume = 0.45;
    let musicNodes = null;
    let longPressTimer = null;
    let lastHeartTapTime = 0;
    let singleTapTimer = null;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ============================================================
       UTIL
    ============================================================ */
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    function dismissHint() {
      if (hintDismissed) return;
      hintDismissed = true;
      hintText.style.opacity = '0';
      setTimeout(() => { hintText.style.display = 'none'; }, 1500);
    }

    function createRoseBurst(originX = window.innerWidth / 2, originY = window.innerHeight / 2) {
      if (!roseBurst) return;
      roseBurst.replaceChildren();
      const count = window.innerWidth < 600 ? 28 : 44;
      for (let i = 0; i < count; i++) {
        const petal = document.createElement('span');
        petal.className = 'burst-petal';
        petal.style.left = `${originX}px`;
        petal.style.top = `${originY}px`;
        const angle = Math.random() * Math.PI * 2;
        const distance = 120 + Math.random() * Math.min(window.innerWidth, window.innerHeight) * 0.42;
        petal.style.setProperty('--burst-x', `${Math.cos(angle) * distance}px`);
        petal.style.setProperty('--burst-y', `${Math.sin(angle) * distance}px`);
        petal.style.setProperty('--burst-r', `${Math.round(-180 + Math.random() * 360)}deg`);
        petal.style.animationDelay = `${Math.random() * 0.12}s`;
        roseBurst.appendChild(petal);
      }
      setTimeout(() => roseBurst.replaceChildren(), 2200);
    }

    function showSecretMessage(message) {
      secretNote.textContent = message;
      secretNote.classList.add('visible');
      createRoseBurst();
      setTimeout(() => secretNote.classList.remove('visible'), 3600);
    }

    function createHeartBurst(originX = window.innerWidth / 2, originY = window.innerHeight / 2) {
      roseBurst.replaceChildren();
      const count = window.innerWidth < 600 ? 18 : 28;
      for (let i = 0; i < count; i++) {
        const heart = document.createElement('span');
        heart.className = 'burst-heart';
        heart.textContent = '♥';
        heart.style.left = `${originX}px`;
        heart.style.top = `${originY}px`;
        const t = (i / count) * Math.PI * 2;
        const heartX = 16 * Math.pow(Math.sin(t), 3);
        const heartY = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        const scale = 4 + Math.random() * 3;
        heart.style.setProperty('--burst-x', `${heartX * scale}px`);
        heart.style.setProperty('--burst-y', `${heartY * scale}px`);
        heart.style.animationDelay = `${Math.random() * 0.18}s`;
        roseBurst.appendChild(heart);
      }
      setTimeout(() => roseBurst.replaceChildren(), 2200);
    }

    function createPetals() {
      const container = document.querySelector('.petals');
      if (!container) return;
      const count = window.innerWidth < 600 ? 10 : 18;
      for (let i = 0; i < count; i++) {
        const petal = document.createElement('span');
        petal.className = 'petal';
        petal.style.left = `${4 + Math.random() * 92}%`;
        petal.style.setProperty('--fall-duration', `${10 + Math.random() * 8}s`);
        petal.style.setProperty('--fall-delay', `${Math.random() * -18}s`);
        petal.style.setProperty('--drift', `${-80 + Math.random() * 160}px`);
        petal.style.transform = `scale(${0.55 + Math.random() * 0.8})`;
        container.appendChild(petal);
      }
    }

    /* ============================================================
       LOGO FLASH SEQUENCE
    ============================================================ */
    function startLogoSequence() {
      const logoDelay = prefersReducedMotion ? 700 : 1900;
      setTimeout(() => {
        logoFlash.classList.add('active');
        setTimeout(() => {
          logoFlash.classList.remove('active');
          logoLayer.style.opacity = '0';
          setTimeout(() => {
            logoLayer.style.display = 'none';
            startMatrixIntro();
          }, 900);
        }, 140);
      }, logoDelay);
    }

    /* ============================================================
       MATRIX INTRO — PINK RAIN with "I love you" characters
    ============================================================ */
    function startMatrixIntro() {
      matrixLayer.style.opacity = '1';
      if (textParticles) textParticles.visible = false;
      if (loveIdentity) loveIdentity.style.opacity = '0';
      const ctx = matrixCanvas.getContext('2d');
      const dpr = Math.min(window.devicePixelRatio, 2);
      let w = window.innerWidth;
      let h = window.innerHeight;
      matrixCanvas.width  = w * dpr;
      matrixCanvas.height = h * dpr;
      matrixCanvas.style.width  = w + 'px';
      matrixCanvas.style.height = h + 'px';
      ctx.scale(dpr, dpr);

      const fontSize = 15;
      const columns = Math.floor(w / fontSize);
      const drops = new Array(columns).fill(0).map(() => Math.random() * -h / fontSize);

      // Characters spell out "I love you" continuously
      const phrase = 'I love you  ';
      let charIndex = 0;

      // Pink palette
      const pinkBright = '#ffc2d8';
      const pinkMain   = '#ff5e9c';
      const pinkDeep   = '#ff1a5e';

      function drawMatrix() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.09)';
        ctx.fillRect(0, 0, w, h);
        ctx.font = `600 ${fontSize}px 'Courier New', monospace`;
        ctx.textAlign = 'center';

        for (let i = 0; i < drops.length; i++) {
          // Pick character from "I love you" phrase
          const ch = phrase[charIndex % phrase.length];
          charIndex++;

          const x = i * fontSize + fontSize / 2;
          const y = drops[i] * fontSize;

          // Random bright sparkle
          const bright = Math.random();
          if (bright > 0.96) {
            ctx.fillStyle = pinkBright;
            ctx.shadowColor = pinkMain;
            ctx.shadowBlur = 14;
          } else {
            // Subtle pink opacity variation
            ctx.fillStyle = `rgba(255, 60, 130, ${0.35 + Math.random() * 0.55})`;
            ctx.shadowBlur = 0;
          }
          ctx.fillText(ch, x, y);

          if (y > h && Math.random() > 0.975) drops[i] = 0;
          drops[i] += 0.55 + Math.random() * 0.7;
        }
        ctx.shadowBlur = 0;
        matrixAnimationId = requestAnimationFrame(drawMatrix);
      }
      drawMatrix();

      // Cinematic typing reveal for "I love you"
      setTimeout(() => {
        loveText.style.opacity = '1';
        typeLoveText();
      }, 1000);

      // Fade out matrix & reveal 3D heart
      setTimeout(() => {
        matrixLayer.style.opacity = '0';
        loveText.style.opacity = '0';
        setTimeout(() => {
          cancelAnimationFrame(matrixAnimationId);
          matrixAnimationId = null;
          matrixLayer.style.display = 'none';
          introFinished = true;
          if (heartGroup) heartGroup.visible = true;
          if (textParticles) textParticles.visible = true;
          if (loveIdentity) loveIdentity.style.opacity = '1';
        }, 1100);
      }, 4200);
    }

    function typeLoveText() {
      const full = 'I love you';
      loveText.innerHTML = '';
      let i = 0;
      const cursor = document.createElement('span');
      cursor.className = 'cursor';
      loveText.appendChild(cursor);

      const typer = setInterval(() => {
        if (i <= full.length) {
          loveText.textContent = full.slice(0, i);
          loveText.appendChild(cursor);
          i++;
        } else {
          clearInterval(typer);
          setTimeout(() => { if (cursor.parentNode) cursor.remove(); }, 1200);
        }
      }, 130);
    }

    /* ============================================================
       HEART SHAPE — correct 3D heart silhouette
    ============================================================ */
    function createHeartShape() {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.55);
      // left lobe
      shape.bezierCurveTo(-0.25, 0.78, -0.55, 0.92, -0.85, 0.78);
      shape.bezierCurveTo(-1.18, 0.62, -1.22, 0.18, -0.95, -0.18);
      // left side to point
      shape.bezierCurveTo(-0.72, -0.48, -0.38, -0.78, 0, -1.18);
      // right side up
      shape.bezierCurveTo(0.38, -0.78, 0.72, -0.48, 0.95, -0.18);
      // right lobe
      shape.bezierCurveTo(1.22, 0.18, 1.18, 0.62, 0.85, 0.78);
      shape.bezierCurveTo(0.55, 0.92, 0.25, 0.78, 0, 0.55);
      return shape;
    }

    /* ============================================================
       3D INIT
    ============================================================ */
    function initThree() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);

      camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 0, 7.4);

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio));
      renderer.domElement.tabIndex = 0;
      renderer.domElement.setAttribute('role', 'img');
      renderer.domElement.setAttribute('aria-label', 'Interactive 3D heart. Drag to rotate, pinch or scroll to zoom, and tap to open the love letter.');
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      canvasContainer.appendChild(renderer.domElement);

      /* ---- Lighting ---- */
      scene.add(new THREE.AmbientLight(0x2a1a20, 1.2));

      const keyLight = new THREE.PointLight(0xff5e7a, 1.6, 30);
      keyLight.position.set(4, 5, 6);
      scene.add(keyLight);

      const fillLight = new THREE.PointLight(0xff1a3c, 1.1, 30);
      fillLight.position.set(-5, 2, 5);
      scene.add(fillLight);

      const rimLight = new THREE.PointLight(0xff8090, 0.9, 20);
      rimLight.position.set(0, -4, -6);
      scene.add(rimLight);

      const softGlow = new THREE.PointLight(0x330011, 1.5, 40);
      softGlow.position.set(0, 1, -8);
      scene.add(softGlow);

      /* ---- Heart Group ---- */
      heartGroup = new THREE.Group();
      heartGroup.visible = false;
      scene.add(heartGroup);

      /* ---- Particle heart ---- */
      heartMesh = null;
      heartInner = null;
      heartHighlight = null;
      createGlassHeart();

      /* ---- Particles ---- */
      createParticles();
      createAmbientParticles();
      createLoveWordParticles();

      /* ---- Interaction ---- */
      setupInteraction();
      window.addEventListener('resize', onWindowResize);
      animate();
    }

    /* ============================================================
       PARTICLES
    ============================================================ */
    function makeSpriteTexture() {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.25, 'rgba(255,190,210,0.85)');
      g.addColorStop(0.6, 'rgba(255,60,120,0.35)');
      g.addColorStop(1, 'rgba(255,0,80,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    }

    function createGlassHeart() {
      const shape = createHeartShape();
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.34,
        bevelEnabled: true,
        bevelSegments: 5,
        steps: 2,
        bevelSize: 0.07,
        bevelThickness: 0.08,
        curveSegments: 28,
      });
      geometry.center();

      const material = new THREE.MeshPhysicalMaterial({
        color: 0x8a071d,
        emissive: 0x5e0012,
        emissiveIntensity: 0.32,
        roughness: 0.12,
        metalness: 0.04,
        transmission: 0.38,
        thickness: 0.9,
        transparent: true,
        opacity: 0.38,
        side: THREE.DoubleSide,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
      });

      heartMesh = new THREE.Mesh(geometry, material);
      heartMesh.scale.setScalar(0.92);
      heartGroup.add(heartMesh);

      const innerGeometry = new THREE.SphereGeometry(0.66, 28, 20);
      const innerMaterial = new THREE.MeshBasicMaterial({
        color: 0xff173f,
        transparent: true,
        opacity: 0.055,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      heartInner = new THREE.Mesh(innerGeometry, innerMaterial);
      heartInner.position.set(0, 0.05, 0.12);
      heartGroup.add(heartInner);
    }

    function createParticles() {
      const count = CONFIG.particleCount;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const palette = [0xff174f, 0xff4d7a, 0xff8fab, 0xffc2d8, 0xffffff];

      for (let i = 0; i < count; i++) {
        const t = Math.random() * Math.PI * 2;
        const fill = Math.sqrt(Math.random());
        const scale = 0.102 + Math.random() * 0.012;
        let x = 16 * Math.pow(Math.sin(t), 3);
        let y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);

        if (Math.random() > 0.46) {
          x *= fill;
          y = y * fill - 0.15;
        } else {
          x = x * (0.96 + Math.random() * 0.05);
          y = y * (0.96 + Math.random() * 0.05) - 0.15;
        }

        positions[i * 3] = x * scale;
        positions[i * 3 + 1] = y * scale;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 0.62 + Math.sin(t * 2) * 0.12;

        const color = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: window.innerWidth < 600 ? 0.066 : 0.058,
        map: makeSpriteTexture(),
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
        opacity: 0.96,
      });

      particleSystem = new THREE.Points(geo, mat);
      heartGroup.add(particleSystem);
    }

    function createAmbientParticles() {
      const count = CONFIG.ambientParticleCount;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        const r = 5 + Math.random() * 10;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        positions[i*3]   = Math.sin(phi) * Math.cos(theta) * r;
        positions[i*3+1] = Math.sin(phi) * Math.sin(theta) * r * 0.7;
        positions[i*3+2] = Math.cos(phi) * r;

        const c = Math.random() > 0.88
          ? new THREE.Color(0x69e3a4)
          : (Math.random() > 0.78 ? new THREE.Color(0xffb0c4) : new THREE.Color(0xff3355));
        colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.1,
        map: makeSpriteTexture(),
        vertexColors: true,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });

      ambientParticles = new THREE.Points(geo, mat);
      scene.add(ambientParticles);
    }

    function makeTextSprite(text, color = '#ff9abb') {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      c.width = 640;
      c.height = 128;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.font = "700 58px Georgia, 'Times New Roman', serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = color;
      ctx.shadowBlur = 22;
      ctx.fillStyle = color;
      ctx.fillText(text, c.width / 2, c.height / 2);

      const texture = new THREE.CanvasTexture(c);
      texture.needsUpdate = true;
      return new THREE.Sprite(new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
    }

    function createLoveWordParticles() {
      textParticles = new THREE.Group();
      textParticles.visible = false;
      textParticles.userData.ringAngle = 0;
      textParticles.userData.radiusX = window.innerWidth < 600 ? 3.05 : 4.45;
      textParticles.userData.radiusY = window.innerWidth < 600 ? 2.45 : 3.35;
      // Show a curated, spacious ring; the full LOVE_PHRASES collection remains available for future surprises.
      const phrases = LOVE_PHRASES.slice(0, 12);

      phrases.forEach((phrase, index) => {
        const angle = (index / phrases.length) * Math.PI * 2;
        const mobile = window.innerWidth < 600;
        const radiusX = mobile ? 3.05 : 4.45;
        const radiusY = mobile ? 2.45 : 3.35;
        const sprite = makeTextSprite(
          phrase,
          index % 5 === 0 ? '#8bf5b8' : (index % 4 === 0 ? '#ffd6e4' : '#ff789d')
        );
        sprite.position.set(
          Math.cos(angle) * radiusX,
          Math.sin(angle) * radiusY,
          -3.8
        );
        sprite.userData.baseAngle = angle;
        sprite.userData.radiusX = radiusX;
        sprite.userData.radiusY = radiusY;
        const width = mobile
          ? (phrase.length > 14 ? 1.45 : 1.65)
          : (phrase.length > 14 ? 2.25 : 1.95);
        sprite.scale.set(width, mobile ? 0.38 : 0.48, 1);
        sprite.userData.baseY = sprite.position.y;
        sprite.userData.phase = index * 0.65;
        textParticles.add(sprite);
      });

      scene.add(textParticles);
    }

    /* ============================================================
       ANIMATION LOOP
    ============================================================ */
    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);

      heartbeatPhase += delta * CONFIG.heartbeatSpeed;
      const beat =
        Math.sin(heartbeatPhase * 2.1) * 0.022 +
        Math.sin(heartbeatPhase * 1.05 + 0.5) * 0.014 +
        Math.sin(heartbeatPhase * 4.3) * 0.006;

      const scale = 1 + beat;
      if (heartGroup) heartGroup.scale.setScalar(scale);

      if (heartMesh && heartMesh.material) {
        heartMesh.rotation.z = Math.sin(heartbeatPhase * 0.45) * 0.018;
        heartMesh.material.emissiveIntensity = 0.28 + beat * 0.16;
      }

      if (heartInner) {
        const innerPulse = 0.72 + Math.sin(heartbeatPhase * 2.6) * 0.035;
        heartInner.scale.setScalar(innerPulse);
        heartInner.material.emissiveIntensity = 1.0 + Math.sin(heartbeatPhase * 2.6) * 0.4;
      }

      if (heartHighlight) {
        heartHighlight.material.emissiveIntensity = 0.4 + Math.sin(heartbeatPhase * 3.1 + 1.2) * 0.25;
      }

      if (!isDragging && !letterVisible) {
        rotationVelocity.x *= CONFIG.inertiaDamping;
        rotationVelocity.y *= CONFIG.inertiaDamping;
        targetRotation.x += rotationVelocity.x * delta * 60;
        targetRotation.y += rotationVelocity.y * delta * 60;
      }

      currentRotation.x += (targetRotation.x - currentRotation.x) * 0.12;
      currentRotation.y += (targetRotation.y - currentRotation.y) * 0.12;

      targetRotation.x = clamp(targetRotation.x, -0.9, 0.9);

      if (heartGroup) {
        heartGroup.rotation.x = currentRotation.x;
        heartGroup.rotation.y = currentRotation.y;
      }

      currentZoom += (targetZoom - currentZoom) * 0.1;
      if (camera) {
        camera.position.z = 7.4 / currentZoom;
        camera.lookAt(0, 0, 0);
      }

      if (ambientParticles) {
        ambientParticles.rotation.y += 0.0003;
        ambientParticles.rotation.x += 0.0001;
      }
      if (particleSystem) {
        particleSystem.rotation.y += 0.0006;
        particleSystem.scale.setScalar(1 + Math.sin(heartbeatPhase * 2.1) * 0.018);
      }
      if (textParticles) {
        textParticles.userData.ringAngle += delta * 0.018;
        textParticles.children.forEach((sprite, index) => {
          const angle = sprite.userData.baseAngle + textParticles.userData.ringAngle;
          sprite.position.x = Math.cos(angle) * sprite.userData.radiusX;
          sprite.position.y =
            Math.sin(angle) * sprite.userData.radiusY +
            Math.sin(heartbeatPhase * 0.7 + sprite.userData.phase) * 0.08;
          sprite.material.opacity = letterVisible
            ? 0.08
            : (0.58 + Math.sin(heartbeatPhase + index) * 0.12);
        });
      }

      if (renderer) renderer.render(scene, camera);
    }

    /* ============================================================
       INTERACTION
    ============================================================ */
    function setupSurprises() {
      const discoveredStars = new Set();
      const starMessages = [
        'A tiny secret: Sinu is my favorite constellation.',
        'Somewhere between every breath and every dream, you are there.',
        'The universe keeps this message safe: you are deeply loved.'
      ];
      secretStar.addEventListener('click', () => {
        discoveredStars.add(0);
        secretStar.classList.add('found');
        showSecretMessage(starMessages[0]);
        checkAllStars();
      });

      soundToggle.addEventListener('click', async () => {
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') await audioContext.resume();
        soundEnabled = !soundEnabled;
        soundToggle.setAttribute('aria-pressed', String(soundEnabled));
        if (soundEnabled) startHeartbeatSound();
      });

      const musicToggle = document.getElementById('music-toggle');
      musicToggle.addEventListener('click', async () => {
        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') await audioContext.resume();
        musicEnabled = !musicEnabled;
        musicToggle.setAttribute('aria-pressed', String(musicEnabled));
        if (musicEnabled) startAmbientMusic();
        else stopAmbientMusic();
      });

      document.getElementById('volume-slider').addEventListener('input', (event) => {
        masterVolume = Number(event.target.value) / 100;
        if (musicNodes) {
          musicNodes.gain.gain.setTargetAtTime(masterVolume * 0.055, audioContext.currentTime, 0.08);
        }
      });

      const starsRoot = document.getElementById('secret-stars');
      const mobile = window.innerWidth < 600;
      const positions = mobile
        ? [{x: 84, y: 24}, {x: 78, y: 68}]
        : [{x: 18, y: 24}, {x: 82, y: 72}];
      positions.forEach((position, index) => {
        const star = document.createElement('button');
        star.className = 'secret-star hidden-star';
        star.textContent = '✦';
        star.setAttribute('aria-label', 'Open a hidden love note');
        star.style.left = `${position.x}%`;
        star.style.top = `${position.y}%`;
        star.style.setProperty('--star-x-offset', '-50%');
        star.addEventListener('click', () => {
          const id = index + 1;
          if (discoveredStars.has(id)) return;
          discoveredStars.add(id);
          star.classList.add('found');
          showSecretMessage(starMessages[id]);
          checkAllStars();
        });
        starsRoot.appendChild(star);
      });

      function checkAllStars() {
        if (discoveredStars.size === 3) {
          showSecretMessage('Every star found. My whole universe is Sinu.');
          createHeartBurst();
          createRoseBurst();
        }
      }

      const randomMessages = ['Still beating for you.', 'You are my favorite thought.', 'Come closer, my heart is waiting.', 'Sinu, my little universe.'];
      setInterval(() => {
        if (!letterVisible && introFinished && Math.random() > 0.68) {
          showSecretMessage(randomMessages[Math.floor(Math.random() * randomMessages.length)]);
        }
      }, 22000);
    }

    function startAmbientMusic() {
      if (!audioContext || musicNodes) return;
      const masterGain = audioContext.createGain();
      masterGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(masterVolume * 0.055, audioContext.currentTime + 1.8);
      masterGain.connect(audioContext.destination);
      musicNodes = { gain: masterGain, oscillators: [] };
      [130.81, 196, 261.63].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.value = index === 0 ? 0.5 : 0.22;
        oscillator.connect(gain);
        gain.connect(masterGain);
        oscillator.start();
        musicNodes.oscillators.push(oscillator);
      });
    }

    function stopAmbientMusic() {
      if (!musicNodes || !audioContext) return;
      const now = audioContext.currentTime;
      musicNodes.gain.gain.cancelScheduledValues(now);
      musicNodes.gain.gain.setValueAtTime(Math.max(musicNodes.gain.gain.value, 0.0001), now);
      musicNodes.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
      const oscillators = musicNodes.oscillators;
      setTimeout(() => oscillators.forEach((oscillator) => {
        try { oscillator.stop(); } catch (_) {}
      }), 760);
      musicNodes = null;
    }

    function startHeartbeatSound() {
      if (!soundEnabled || !audioContext) return;
      const now = audioContext.currentTime;
      [0, 0.16].forEach((delay, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(index === 0 ? 58 : 48, now + delay);
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.035 * masterVolume, now + delay + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.11);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now + delay);
        oscillator.stop(now + delay + 0.12);
      });
      setTimeout(() => startHeartbeatSound(), 1100);
    }

    function setupInteraction() {
      const el = renderer.domElement;

      el.addEventListener('pointerdown', onPointerDown, { passive: false });
      el.addEventListener('pointermove', onPointerMove, { passive: false });
      el.addEventListener('pointerup',   onPointerUp,   { passive: false });
      el.addEventListener('pointercancel', onPointerUp, { passive: false });
      el.addEventListener('wheel', onWheel, { passive: false });
      el.addEventListener('contextmenu', e => e.preventDefault());

      let pinchStartDist = 0;
      let pinchStartZoom = 1;
      let isPinching = false;

      el.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2 && !letterVisible) {
          e.preventDefault();
          isPinching = true;
          isDragging = false;
          tapCandidate = false;
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          pinchStartDist = Math.hypot(dx, dy);
          pinchStartZoom = targetZoom;
        }
      }, { passive: false });

      el.addEventListener('touchmove', (e) => {
        if (isPinching && e.touches.length === 2 && !letterVisible) {
          e.preventDefault();
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.hypot(dx, dy);
          if (pinchStartDist > 0) {
            const factor = dist / pinchStartDist;
            targetZoom = clamp(pinchStartZoom * factor, CONFIG.zoomMin, CONFIG.zoomMax);
          }
        }
      }, { passive: false });

      el.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
          isPinching = false;
          pinchStartDist = 0;
        }
      }, { passive: false });

      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hideLetter();
      });
      letterOverlay.addEventListener('pointerdown', (e) => {
        if (e.target === letterOverlay) e.preventDefault();
        else e.stopPropagation();
      });
    }

    function onPointerDown(e) {
      if (letterVisible) return;
      e.preventDefault();
      dismissHint();
      clearTimeout(longPressTimer);

      const rect = renderer.domElement.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      let hitHeart = false;
      if (particleSystem) {
        const heartX = 0;
        const heartY = 0;
        const dx = nx - heartX;
        const dy = ny - heartY;
        hitHeart = (dx * dx) / 0.42 + (dy * dy) / 0.58 < 1.15;
      }

      if (hitHeart) {
        holdBloom.style.left = `${e.clientX}px`;
        holdBloom.style.top = `${e.clientY}px`;
        holdBloom.classList.remove('visible');
        void holdBloom.offsetWidth;
        holdBloom.classList.add('visible');
        longPressTimer = setTimeout(() => {
          createHeartBurst(e.clientX, e.clientY);
          showSecretMessage('Some hearts recognize each other without a word.');
          if (navigator.vibrate) navigator.vibrate([25, 40, 25]);
        }, 850);
      }

      tapCandidate = hitHeart;
      tapStartTime = performance.now();
      tapStartPos = { x: e.clientX, y: e.clientY };

      isDragging = true;
      previousPointer.x = e.clientX;
      previousPointer.y = e.clientY;
      rotationVelocity.x = 0;
      rotationVelocity.y = 0;

      try { renderer.domElement.setPointerCapture(e.pointerId); } catch(_) {}
    }

    function onPointerMove(e) {
      if (!isDragging || letterVisible) return;
      e.preventDefault();
      if (Math.hypot(e.clientX - tapStartPos.x, e.clientY - tapStartPos.y) > 5) {
        clearTimeout(longPressTimer);
        holdBloom.classList.remove('visible');
      }

      const dx = e.clientX - previousPointer.x;
      const dy = e.clientY - previousPointer.y;

      const totalDx = e.clientX - tapStartPos.x;
      const totalDy = e.clientY - tapStartPos.y;
      if (Math.hypot(totalDx, totalDy) > CONFIG.tapMaxDistance) {
        tapCandidate = false;
      }

      rotationVelocity.y += dx * CONFIG.dragSensitivity * 0.5;
      rotationVelocity.x += dy * CONFIG.dragSensitivity * 0.5;
      targetRotation.y += dx * CONFIG.dragSensitivity;
      targetRotation.x += dy * CONFIG.dragSensitivity;

      previousPointer.x = e.clientX;
      previousPointer.y = e.clientY;
    }

    function onPointerUp(e) {
      if (letterVisible) return;
      clearTimeout(longPressTimer);
      holdBloom.classList.remove('visible');
      isDragging = false;
      if (e.type === 'pointercancel') {
        tapCandidate = false;
        return;
      }

      if (tapCandidate) {
        const elapsed = performance.now() - tapStartTime;
        const dx = e.clientX - tapStartPos.x;
        const dy = e.clientY - tapStartPos.y;
        const dist = Math.hypot(dx, dy);
        if (elapsed < CONFIG.tapMaxDuration && dist < CONFIG.tapMaxDistance) {
          const now = performance.now();
          if (now - lastHeartTapTime < 320) {
            lastHeartTapTime = 0;
            clearTimeout(singleTapTimer);
            createRoseBurst(e.clientX, e.clientY);
            createHeartBurst(e.clientX, e.clientY);
            showSecretMessage('I love you, Sinu.');
          } else {
            lastHeartTapTime = now;
            clearTimeout(singleTapTimer);
            singleTapTimer = setTimeout(showLetter, 280);
          }
        }
      }
      tapCandidate = false;

      try { renderer.domElement.releasePointerCapture(e.pointerId); } catch(_) {}
    }

    function onWheel(e) {
      if (letterVisible) return;
      e.preventDefault();
      dismissHint();
      targetZoom = clamp(targetZoom - e.deltaY * 0.0016, CONFIG.zoomMin, CONFIG.zoomMax);
    }

    /* ============================================================
       LETTER
    ============================================================ */
    function showLetter() {
      letterVisible = true;
      letterOverlay.classList.remove('hidden');
      letterOverlay.classList.remove('closing', 'reading', 'seal-opening');
      letterOverlay.setAttribute('aria-hidden', 'false');
      letterOverlay.classList.add('visible');
      if (heartMesh && heartMesh.material) {
        heartMesh.material.opacity = 0.12;
      }
      setTimeout(() => letterOverlay.classList.add('seal-opening'), 520);
      setTimeout(() => {
        letterOverlay.classList.add('reading');
        createRoseBurst(window.innerWidth / 2, window.innerHeight / 2);
      }, 1450);
      rotationVelocity.x = 0;
      rotationVelocity.y = 0;
      isDragging = false;
      tapCandidate = false;
      closeBtn.focus({ preventScroll: true });
    }

    function hideLetter() {
      letterVisible = false;
      letterOverlay.setAttribute('aria-hidden', 'true');
      letterOverlay.classList.remove('seal-opening');
      letterOverlay.classList.add('closing');
      if (heartMesh && heartMesh.material) heartMesh.material.opacity = 0.38;
      setTimeout(() => {
        letterOverlay.classList.remove('visible', 'reading', 'closing');
      }, 800);
      if (renderer && renderer.domElement) renderer.domElement.focus?.();
    }

    /* ============================================================
       RESIZE
    ============================================================ */
    function onWindowResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (camera && renderer) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio));
      }
    }

    /* ============================================================
       WEBGL CHECK + 2D FALLBACK
    ============================================================ */
    function webglSupported() {
      try {
        const c = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
      } catch (e) { return false; }
    }

    function setupFallback2D() {
      fallback2d.style.display = 'block';
      canvasContainer.style.display = 'none';
      const ctx = fallback2d.getContext('2d');

      function resize() {
        const dpr = Math.min(window.devicePixelRatio, 2);
        fallback2d.width  = window.innerWidth * dpr;
        fallback2d.height = window.innerHeight * dpr;
        fallback2d.style.width  = window.innerWidth + 'px';
        fallback2d.style.height = window.innerHeight + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      resize();
      window.addEventListener('resize', resize);

      let phase = 0;

      function draw() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        phase += 0.016;
        const beat = Math.sin(phase * 2.4) * 0.03 + 1;
        const cx = w / 2;
        const cy = h / 2;
        const s = Math.min(w, h) * 0.36 * beat;

        ctx.save();
        ctx.shadowColor = '#ff2a4d';
        ctx.shadowBlur = 40;

        for (let i = 0; i < 760; i++) {
          const t = Math.random() * Math.PI * 2;
          const fill = Math.sqrt(Math.random());
          let px = 16 * Math.pow(Math.sin(t), 3);
          let py = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
          px *= fill;
          py = py * fill;
          px = cx + px * s * 0.085;
          py = cy - py * s * 0.085;
          const pulse = 0.7 + Math.random() * 0.9;
          ctx.fillStyle = i % 3 === 0 ? `rgba(255,210,225,${pulse})` : `rgba(255,55,105,${pulse * 0.82})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.2 + Math.random() * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }

        const phrases = LOVE_PHRASES.slice(0, 10);
        ctx.font = `600 ${Math.max(10, s * 0.055)}px Georgia`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#ff789d';
        ctx.shadowBlur = 16;
        phrases.forEach((phrase, i) => {
          const angle = phase * 0.16 + i * Math.PI / 3;
          const radius = s * 1.55;
          ctx.fillStyle = `rgba(255,150,180,${0.65 + Math.sin(phase + i) * 0.2})`;
          ctx.fillText(phrase, cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius * 0.65);
        });

        for (let i = 0; i < 22; i++) {
          const a = (i / 22) * Math.PI * 2 + phase * 0.3;
          const r = s * (1.4 + Math.sin(phase + i) * 0.2);
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r * 0.8;
          const alpha = 0.25 + Math.sin(phase * 2 + i) * 0.2;
          ctx.beginPath();
          ctx.fillStyle = i % 5 === 0 ? `rgba(255,210,225,${alpha})` : `rgba(255,90,120,${alpha})`;
          ctx.arc(px, py, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        requestAnimationFrame(draw);
      }
      draw();

      fallback2d.addEventListener('pointerdown', (e) => {
        if (letterVisible) return;
        const rect = fallback2d.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const s = Math.min(window.innerWidth, window.innerHeight) * 0.36;
        const dx = (x - cx) / s;
        const dy = (y - cy) / s;
        if (Math.abs(dx) < 1.15 && dy > -1.25 && dy < 0.9) {
          if (dx*dx + (dy - 0.35)*(dy - 0.35) < 1.4 || dy > 0.2) {
            showLetter();
          }
        }
      });
    }

    /* ============================================================
       VISIBILITY
    ============================================================ */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      } else if (!animationFrameId && webglOK && renderer) {
        clock.getDelta();
        animate();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && letterVisible) hideLetter();
    });

    /* ============================================================
       BOOT
    ============================================================ */
    function boot() {
      startLogoSequence();
      createPetals();
      setupSurprises();
      webglOK = webglSupported();
      if (webglOK) {
        initThree();
      } else {
        setupFallback2D();
      }
    }

    window.addEventListener('load', boot);

    document.addEventListener('touchmove', (e) => {
      if (e.target === document.body || e.target === canvasContainer) e.preventDefault();
    }, { passive: false });