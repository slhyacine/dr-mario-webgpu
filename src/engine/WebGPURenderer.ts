import { spriteVertex, spriteFragment } from './shaders';

export interface RenderSprite {
    x: number;
    y: number;
    w: number;
    h: number;
    color: [number, number, number, number]; // RGBA
    typeId: number; // 0=Generic, 1=Pill, 2=Virus
}

export class WebGPURenderer {
    canvas: HTMLCanvasElement;
    adapter!: GPUAdapter;
    device!: GPUDevice;
    context!: GPUCanvasContext;
    pipeline!: GPURenderPipeline;

    uniformBuffer!: GPUBuffer;
    instanceBuffer!: GPUBuffer;

    // Max sprites per frame
    static MAX_SPRITES = 2000;
    // Float32s per instance: pos(2) + size(2) + color(4) + type(1) = 9
    // Padding to 12 floats (48 bytes) for alignment if needed, but 9 is fine for vertex buffer if stride is set right.
    // Let's use 12 (3 vec4s) for simplicity/alignment.
    // 0: pos.x, pos.y, size.x, size.y
    // 1: r, g, b, a
    // 2: typeId, padding, padding, padding

    instanceData = new Float32Array(WebGPURenderer.MAX_SPRITES * 12);

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    private destroyed = false;

    destroy() {
        this.destroyed = true;
    }

    async init() {
        if (!navigator.gpu) throw new Error("WebGPU not supported");

        this.adapter = (await navigator.gpu.requestAdapter())!;
        if (this.destroyed) return;

        this.device = await this.adapter.requestDevice();
        if (this.destroyed) return;

        this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;

        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

        if (this.destroyed) return;

        this.context.configure({
            device: this.device,
            format: presentationFormat,
            alphaMode: 'premultiplied',
        });

        // Create Bind Group Layout
        const bindGroupLayout = this.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: 'uniform' }
            }]
        });

        // Pipeline
        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        });

        const shaderModuleVertex = this.device.createShaderModule({ code: spriteVertex });
        const shaderModuleFragment = this.device.createShaderModule({ code: spriteFragment });

        this.pipeline = this.device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: shaderModuleVertex,
                entryPoint: 'main',
                buffers: [{
                    arrayStride: 12 * 4, // 12 floats * 4 bytes
                    stepMode: 'instance',
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x2' }, // pos
                        { shaderLocation: 1, offset: 8, format: 'float32x2' }, // size
                        { shaderLocation: 2, offset: 16, format: 'float32x4' }, // color
                        { shaderLocation: 3, offset: 32, format: 'float32' },  // typeId
                    ]
                }]
            },
            fragment: {
                module: shaderModuleFragment,
                entryPoint: 'main',
                targets: [{
                    format: presentationFormat,
                    blend: {
                        color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                        alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
                    }
                }]
            },
            primitive: { topology: 'triangle-strip' },
        });

        // Uniform Buffer (Screen Size)
        this.uniformBuffer = this.device.createBuffer({
            size: 16, // vec2f + padding
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // Instance Buffer
        this.instanceBuffer = this.device.createBuffer({
            size: this.instanceData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

        // Bind Group
        this.bindGroup = this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }]
        });
    }

    bindGroup!: GPUBindGroup;

    render(sprites: RenderSprite[]) {
        if (!this.device) return;

        // Update Uniforms
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.device.queue.writeBuffer(this.uniformBuffer, 0, new Float32Array([w, h]));

        // Update Instances
        let count = 0;
        for (const s of sprites) {
            if (count >= WebGPURenderer.MAX_SPRITES) break;
            const i = count * 12;

            this.instanceData[i + 0] = s.x;
            this.instanceData[i + 1] = s.y;
            this.instanceData[i + 2] = s.w;
            this.instanceData[i + 3] = s.h;

            this.instanceData[i + 4] = s.color[0];
            this.instanceData[i + 5] = s.color[1];
            this.instanceData[i + 6] = s.color[2];
            this.instanceData[i + 7] = s.color[3];

            this.instanceData[i + 8] = s.typeId;

            count++;
        }

        this.device.queue.writeBuffer(this.instanceBuffer, 0, this.instanceData, 0, count * 12 * 4);

        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                clearValue: { r: 0.02, g: 0.02, b: 0.08, a: 1.0 }, // Background color
                loadOp: 'clear',
                storeOp: 'store',
            }]
        });

        passEncoder.setPipeline(this.pipeline);
        passEncoder.setBindGroup(0, this.bindGroup);
        passEncoder.setVertexBuffer(0, this.instanceBuffer);
        passEncoder.draw(4, count, 0, 0); // 4 vertices per quad, Instanced
        passEncoder.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }
}
