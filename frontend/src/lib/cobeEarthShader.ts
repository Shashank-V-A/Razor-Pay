/**
 * Cobe uses a single baseColor for the whole globe. Patch the fragment shader
 * for the duration of createGlobe so land and water can use Earth colors.
 */
const COBE_ALBEDO =
  "m+=vec4(F*(mix((1.-q)*pow(i,.4),q,n.z)+.1)+pow(1.-i,4.)*w,1)"

/** Dark blue ocean, then land green, sampled from Cobe's land-mask texture. */
const EARTH_ALBEDO =
  "vec3 E=mix(vec3(.12,.32,.72),vec3(.22,.56,.28),texture2D(z,vec2(e*.5/3.141593,-(j/3.141593+.5))).x);m+=vec4(E*(mix((1.-q)*pow(i,.4),q,n.z)+.1)+pow(1.-i,4.)*w,1)"

function patchShaderSource(
  proto: { shaderSource: (shader: WebGLShader, source: string) => void },
) {
  const original = proto.shaderSource
  proto.shaderSource = function patched(this: unknown, shader: WebGLShader, source: string) {
    if (source.includes(COBE_ALBEDO)) {
      source = source.replace(COBE_ALBEDO, EARTH_ALBEDO)
    }
    return original.call(this, shader, source)
  }
  return () => {
    proto.shaderSource = original
  }
}

export function withEarthGlobeShader<T>(create: () => T): T {
  const restorers = [patchShaderSource(WebGLRenderingContext.prototype)]
  if (typeof WebGL2RenderingContext !== "undefined") {
    restorers.push(patchShaderSource(WebGL2RenderingContext.prototype))
  }
  try {
    return create()
  } finally {
    restorers.forEach((restore) => restore())
  }
}
