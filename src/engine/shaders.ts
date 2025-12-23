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

fn sdBox(p: vec2f, b: vec2f) -> f32 {
    let d = abs(p) - b;
    return length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0);
}

@fragment
fn main(in: VertexOutput) -> @location(0) vec4f {
  let center = vec2f(0.5, 0.5);
  let p = in.uv - center;
  
  var alpha = 1.0;
  var color = in.color.rgb;
  let typeId = u32(in.typeId + 0.5);
  
  // typeId: 0=Block/BG, 1=Virus, 10=PillL, 11=PillR, 12=PillT, 13=PillB, 14=Dot
  if (typeId >= 10u) { 
     // Less rounded pill (Rounded Box with small radius)
     var b = vec2f(0.38, 0.38);
     
     // Connect parts
     if (typeId == 10u && p.x > 0.0) { b.x = 0.52; } // Pill Left
     if (typeId == 11u && p.x < 0.0) { b.x = 0.52; } // Pill Right
     if (typeId == 12u && p.y > 0.0) { b.y = 0.52; } // Pill Top
     if (typeId == 13u && p.y < 0.0) { b.y = 0.52; } // Pill Bottom
     if (typeId == 14u) { b = vec2f(0.38, 0.38); } // Dot
     
     let d = sdBox(p, b);
     alpha = 1.0 - smoothstep(0.0, 0.03, d);
     
     // Bevel-like highlight
     let h = smoothstep(0.4, 0.0, length(p + vec2f(0.1, 0.1)));
     color += vec3f(0.15) * h;
     
     // Subtle border
     if (d > -0.05 && d < 0.0) {
        color *= 0.8;
     }

  } else if (typeId == 1u) { 
     // Virus: Less rounded, more "pixelated" or "buggy" look
     let body = sdBox(p, vec2f(0.35, 0.35));
     
     // Add some "legs/antennas"
     let l1 = sdBox(p - vec2f(0.35, 0.35), vec2f(0.1, 0.1));
     let l2 = sdBox(p - vec2f(-0.35, 0.35), vec2f(0.1, 0.1));
     let l3 = sdBox(p - vec2f(0.35, -0.35), vec2f(0.1, 0.1));
     let l4 = sdBox(p - vec2f(-0.35, -0.35), vec2f(0.1, 0.1));
     
     let d = min(body, min(min(l1, l2), min(l3, l4)));
     alpha = 1.0 - smoothstep(0.0, 0.03, d);
     
     // Eyes: Blocky eyes
     let eyeL = sdBox(p - vec2f(-0.15, -0.1), vec2f(0.08, 0.08));
     let eyeR = sdBox(p - vec2f(0.15, -0.1), vec2f(0.08, 0.08));
     
     if (eyeL < 0.0 || eyeR < 0.0) {
        color = vec3f(1.0);
        let pupilL = sdBox(p - vec2f(-0.15, -0.1), vec2f(0.03, 0.03));
        let pupilR = sdBox(p - vec2f(0.15, -0.1), vec2f(0.03, 0.03));
        if (pupilL < 0.0 || pupilR < 0.0) { color = vec3f(0.0); }
     }
     
     // Jagged texture (Fix: use fmod or integer ops)
     let check = u32(floor(in.uv.x * 10.0) + floor(in.uv.y * 10.0));
     if ((check % 2u) == 0u) {
        color *= 0.9;
     }
  } else {
     // Default for typeId 0 or others
     alpha = 1.0;
  }
  
  if (alpha <= 0.01) { discard; }
  return vec4f(color, in.color.a * alpha);
}
`;
