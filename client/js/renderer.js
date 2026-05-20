/** Battlefield canvas — WebGPU with 2D fallback. */

class GameRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      this.ctx = null;
      return;
    }
    this.ctx = this.canvas.getContext('2d');
    this.animationFrame = null;
    this.particles = [];
    this.spells = [];

    this.adapter = null;
    this.device = null;
    this.context = null;
    this.gpuAvailable = false;
    this.initialized = false;

    this.initializeWebGPU();
  }

  /**
   * Initialize WebGPU device and context
   */
  async initializeWebGPU() {
    try {
      // Check if WebGPU is available
      if (!navigator.gpu) {
        console.warn('WebGPU not supported. Falling back to Canvas 2D API.');
        this.gpuAvailable = false;
        return;
      }

      // Request adapter
      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!this.adapter) {
        console.warn('No GPU adapter found. Using Canvas 2D.');
        this.gpuAvailable = false;
        return;
      }

      // Request device from adapter
      this.device = await this.adapter.requestDevice();

      // Get WebGPU context from canvas
      this.context = this.canvas.getContext('webgpu');

      if (!this.context) {
        console.warn('WebGPU context unavailable. Using Canvas 2D.');
        this.gpuAvailable = false;
        return;
      }

      // Configure canvas for WebGPU
      const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: canvasFormat
      });

      this.gpuAvailable = true;
      this.initialized = true;
      console.log('✓ WebGPU initialized successfully');
      
      this.createRenderPipeline();
    } catch (error) {
      console.warn('WebGPU initialization failed:', error);
      console.log('Falling back to Canvas 2D API...');
      this.gpuAvailable = false;
    }
  }

  /**
   * Create WebGPU render pipeline
   */
  async createRenderPipeline() {
    if (!this.device || !this.context) return;

    try {
      // Shader code for basic rendering
      const shaderCode = `
        @vertex
        fn vertex_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
          var vertices = array(
            vec2(-1.0, -1.0),
            vec2(1.0, -1.0),
            vec2(0.0, 1.0),
          );
          return vec4<f32>(vertices[vertex_index], 0.0, 1.0);
        }

        @fragment
        fn fragment_main() -> @location(0) vec4<f32> {
          return vec4<f32>(0.5, 0.2, 0.8, 1.0); // Purple for magical effect
        }
      `;

      const shaderModule = this.device.createShaderModule({ code: shaderCode });

      this.renderPipeline = this.device.createRenderPipeline({
        layout: 'auto',
        vertex: {
          module: shaderModule,
          entryPoint: 'vertex_main'
        },
        fragment: {
          module: shaderModule,
          entryPoint: 'fragment_main',
          targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }]
        },
        primitive: {
          topology: 'triangle-list'
        }
      });

      console.log('✓ WebGPU render pipeline created');
    } catch (error) {
      console.error('Pipeline creation failed:', error);
      this.gpuAvailable = false;
    }
  }

  /**
   * WebGPU render pass (if available)
   */
  gpuRender() {
    if (!this.device || !this.context) return;

    try {
      const commandEncoder = this.device.createCommandEncoder();
      const textureView = this.context.getCurrentTexture().createView();

      const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: textureView,
            clearValue: { r: 0.1, g: 0.05, b: 0.2, a: 1.0 },
            loadOp: 'clear',
            storeOp: 'store'
          }
        ]
      });

      if (this.renderPipeline) {
        renderPass.setPipeline(this.renderPipeline);
        renderPass.draw(3);
      }

      renderPass.end();
      this.device.queue.submit([commandEncoder.finish()]);
    } catch (error) {
      console.error('GPU render error:', error);
      this.gpuAvailable = false;
    }
  }

  /**
   * Draw the game board
   */
  drawBoard(player1Name, player2Name, player1HP, player2HP) {
    // Use WebGPU if available and initialized, otherwise fall back to Canvas 2D
    if (this.gpuAvailable && this.initialized) {
      this.gpuRender();
    }

    // Always draw UI layer with Canvas 2D (for compatibility)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw gradient background (Hogwarts theme)
    const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    gradient.addColorStop(0, 'rgba(30, 60, 114, 0.8)');
    gradient.addColorStop(0.5, 'rgba(50, 40, 100, 0.8)');
    gradient.addColorStop(1, 'rgba(126, 34, 206, 0.8)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw center line (dueling arena boundary)
    this.ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([10, 10]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2, 0);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Draw player areas
    this.drawPlayerArea(50, 'LEFT', player1Name, player1HP);
    this.drawPlayerArea(this.canvas.width - 50, 'RIGHT', player2Name, player2HP);

    // Draw spells
    this.spells.forEach(spell => this.drawSpell(spell));

    // Draw particles
    this.particles.forEach(particle => this.drawParticle(particle));

    // Update animations
    this.updateAnimations();
  }

  /**
   * Draw individual player area
   */
  drawPlayerArea(x, side, name, hp) {
    const y = this.canvas.height / 2;
    const circleRadius = 50;

    // Draw character circle
    this.ctx.fillStyle = side === 'LEFT' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw glow effect
    this.ctx.strokeStyle = side === 'LEFT' ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Draw character emoji
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '40px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(side === 'LEFT' ? '🧙' : '🧛', x, y);

    // Draw name
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(name, x, y + circleRadius + 20);

    // Draw HP bar
    const barWidth = 80;
    const barHeight = 10;
    const barX = x - barWidth / 2;
    const barY = y - circleRadius - 30;

    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    // HP bar
    const hpPercent = hp / 10;
    this.ctx.fillStyle = side === 'LEFT' ? '#10b981' : '#ef4444';
    this.ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

    // Border
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);

    // HP text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(Math.max(0, hp) + '/10', x, barY - 10);
  }

  /**
   * Draw spell animation
   */
  drawSpell(spell) {
    if (spell.type === 'lightning') {
      this.drawLightning(spell);
    } else if (spell.type === 'fire') {
      this.drawFireball(spell);
    } else if (spell.type === 'ice') {
      this.drawIcebolt(spell);
    }
  }

  /**
   * Draw lightning spell effect
   */
  drawLightning(spell) {
    const progress = spell.progress;
    
    this.ctx.strokeStyle = `rgba(255, 220, 0, ${1 - progress})`;
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = 'rgba(255, 220, 0, 0.8)';
    this.ctx.shadowBlur = 20;

    // Draw zigzag lightning
    const startX = spell.startX;
    const startY = spell.startY;
    const endX = spell.endX;
    const endY = spell.endY;

    const segments = 5;
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);

    for (let i = 1; i < segments; i++) {
      const x = startX + (endX - startX) * (i / segments) + (Math.random() - 0.5) * 30;
      const y = startY + (endY - startY) * (i / segments);
      this.ctx.lineTo(x, y);
    }

    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();

    this.ctx.shadowColor = 'transparent';
  }

  /**
   * Draw fireball effect
   */
  drawFireball(spell) {
    const progress = spell.progress;
    const currentX = spell.startX + (spell.endX - spell.startX) * progress;
    const currentY = spell.startY + (spell.endY - spell.startY) * progress;
    const radius = 20 * (1 - progress);

    // Outer glow
    this.ctx.fillStyle = `rgba(239, 68, 68, ${0.6 * (1 - progress)})`;
    this.ctx.beginPath();
    this.ctx.arc(currentX, currentY, radius * 1.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Core
    this.ctx.fillStyle = 'rgba(255, 165, 0, 1)';
    this.ctx.beginPath();
    this.ctx.arc(currentX, currentY, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Center highlight
    this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
    this.ctx.beginPath();
    this.ctx.arc(currentX - radius / 3, currentY - radius / 3, radius / 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draw ice bolt effect
   */
  drawIcebolt(spell) {
    const progress = spell.progress;
    const currentX = spell.startX + (spell.endX - spell.startX) * progress;
    const currentY = spell.startY + (spell.endY - spell.startY) * progress;
    const size = 25 * (1 - progress);

    // Ice crystal shape
    this.ctx.fillStyle = `rgba(100, 200, 255, ${0.8 * (1 - progress)})`;
    this.ctx.strokeStyle = `rgba(150, 220, 255, ${1 - progress})`;
    this.ctx.lineWidth = 2;

    // Draw hexagon
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = currentX + Math.cos(angle) * size;
      const y = currentY + Math.sin(angle) * size;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
  }

  /**
   * Draw particle effect
   */
  drawParticle(particle) {
    this.ctx.fillStyle = particle.color;
    this.ctx.globalAlpha = particle.alpha;
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
  }

  /**
   * Create spell animation
   */
  createSpell(type, startX, startY, endX, endY, duration = 500) {
    const spell = {
      type,
      startX,
      startY,
      endX,
      endY,
      progress: 0,
      duration,
      startTime: Date.now()
    };

    this.spells.push(spell);

    // Auto-remove when done
    setTimeout(() => {
      const index = this.spells.indexOf(spell);
      if (index > -1) this.spells.splice(index, 1);
    }, duration);
  }

  /**
   * Create particle burst (e.g., on damage)
   */
  createParticleBurst(x, y, color = 'rgba(239, 68, 68, 0.8)', count = 15) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 2 + Math.random() * 4;

      const particle = {
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        size: 3 + Math.random() * 3,
        color: color,
        life: 500
      };

      this.particles.push(particle);
    }
  }

  /**
   * Screen shake effect (for critical hits)
   */
  shakeScreen(intensity = 10, duration = 300) {
    const startTime = Date.now();
    const shakeInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        this.canvas.style.transform = 'translate(0, 0)';
        clearInterval(shakeInterval);
        return;
      }

      const offsetX = (Math.random() - 0.5) * intensity;
      const offsetY = (Math.random() - 0.5) * intensity;
      this.canvas.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    }, 16);
  }

  /**
   * Update animations
   */
  updateAnimations() {
    const now = Date.now();

    // Update spells
    this.spells.forEach(spell => {
      spell.progress = Math.min(1, (now - spell.startTime) / spell.duration);
    });

    // Update particles
    this.particles = this.particles.filter(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.1; // Gravity
      particle.alpha -= 1 / (particle.life / 16);
      return particle.alpha > 0;
    });
  }

  /**
   * Draw critical hit effect
   */
  drawCriticalHit(x, y) {
    // Draw explosion star
    this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
    this.ctx.font = 'bold 40px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('⭐ CRITICAL!', x, y);

    this.createParticleBurst(x, y, 'rgba(255, 255, 0, 0.9)', 20);
    this.shakeScreen(15, 400);
  }
}

// ==================== INITIALIZATION ====================

let renderer1v1 = null;
let renderer2v2 = null;

document.addEventListener('DOMContentLoaded', () => {
  const canvas1v1 = document.getElementById('canvas-battlefield-1v1');
  const canvas2v2 = document.getElementById('canvas-battlefield-2v2');

  if (canvas1v1) {
    renderer1v1 = new GameRenderer('canvas-battlefield-1v1');
  }

  if (canvas2v2) {
    renderer2v2 = new GameRenderer('canvas-battlefield-2v2');
  }

  let animating = false;

  function animate() {
    if (!animating) return;

    const onBattlefield =
      !document.getElementById('screen-1v1')?.classList.contains('hidden') ||
      !document.getElementById('screen-2v2')?.classList.contains('hidden');

    if (onBattlefield && renderer1v1) {
      renderer1v1.drawBoard('Player 1', 'Player 2', 10, 10);
    }

    requestAnimationFrame(animate);
  }

  window.startBattlefieldRender = () => {
    if (!animating) {
      animating = true;
      requestAnimationFrame(animate);
    }
  };

  window.stopBattlefieldRender = () => {
    animating = false;
  };
});

// Export for use
window.GameRenderer = GameRenderer;
