export const spriteVertex = `
struct Uniforms {
  screenSize: vec2f,
}
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct InstanceInput {
  @location(0) pos: vec2f,
  @location(1) size: vec2f,
  @location(2) color: vec4f,
  @location(3) typeId: f32,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec4f,
  @location(2) typeId: f32,
}

@vertex
fn main(@builtin(vertex_index) vIdx: u32, instance: InstanceInput) -> VertexOutput {
  var pos = array<vec2f, 4>(
    vec2f(0.0, 0.0),
    vec2f(1.0, 0.0),
    vec2f(0.0, 1.0),
    vec2f(1.0, 1.0)
  );
  let p = pos[vIdx];
  
  let screenPos = instance.pos + p * instance.size;
  let clipX = (screenPos.x / uniforms.screenSize.x) * 2.0 - 1.0;
  let clipY = -((screenPos.y / uniforms.screenSize.y) * 2.0 - 1.0);
  
  var out: VertexOutput;
  out.position = vec4f(clipX, clipY, 0.0, 1.0);
  out.uv = p;
  out.color = instance.color;
  out.typeId = instance.typeId;
  return out;
}
`;

export const spriteFragment = `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec4f,
  @location(2) typeId: f32,
}

@fragment
fn main(in: VertexOutput) -> @location(0) vec4f {
  let center = vec2f(0.5, 0.5);
  let dist = distance(in.uv, center);
  
  var alpha = 1.0;
  var color = in.color.rgb;
  
  // typeId: 0=Block, 1=Virus, 10=PillL, 11=PillR, 12=PillT, 13=PillB
  if (in.typeId >= 10.0) { 
     // Simple pill capsule
     var d = dist;
     if (in.typeId == 10.0 && in.uv.x > 0.5) { d = 0.0; }
     if (in.typeId == 11.0 && in.uv.x < 0.5) { d = 0.0; }
     if (in.typeId == 12.0 && in.uv.y > 0.5) { d = 0.0; }
     if (in.typeId == 13.0 && in.uv.y < 0.5) { d = 0.0; }
     
     if (d > 0.45) { alpha = 1.0 - smoothstep(0.42, 0.48, d); }
     
     // Simple highlight
     let highlight = smoothstep(0.4, 0.2, distance(in.uv, vec2f(0.3, 0.3)));
     color += vec3f(0.2) * highlight;

  } else if (in.typeId == 1.0) { 
     // Virus
     if (dist > 0.45) { alpha = 0.0; }
     
     // Eyes
     let eyeL = distance(in.uv, vec2f(0.35, 0.4));
     let eyeR = distance(in.uv, vec2f(0.65, 0.4));
     if (eyeL < 0.1 || eyeR < 0.1) {
        color = vec3f(1.0);
        if (eyeL < 0.04 || eyeR < 0.04) { color = vec3f(0.0); }
     }
  }
  
  if (alpha <= 0.0) { discard; }
  return vec4f(color, in.color.a * alpha);
}
`;
