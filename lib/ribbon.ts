import * as THREE from "three";

/**
 * Fita 3D de verdade para o cordão.
 *
 * O `meshline` monta uma tira de triângulos billboardada para a câmera: por
 * construção ela não tem verso, então girar a cena não revela o outro lado do
 * cordão. Aqui a fita é geometria real — dois vértices por seção ao longo da
 * curva, com normal própria — e o material usa DoubleSide. Quando a câmera
 * orbita, o que aparece é literalmente a face de trás da fita, com a arte
 * espelhada, como num cordão impresso dos dois lados.
 *
 * O V vai de 0 a 1 na largura; o U é o comprimento de arco dividido pelo
 * passo do ladrilho, então o lockup nunca estica — a repetição é fracionária
 * e o corte na ponta é o que se vê numa fita saindo do quadro.
 */
export class RibbonGeometry extends THREE.BufferGeometry {
  readonly segments: number;
  private readonly pos: THREE.BufferAttribute;
  private readonly nor: THREE.BufferAttribute;
  private readonly uv: THREE.BufferAttribute;

  constructor(segments = 48) {
    super();
    this.segments = segments;

    const count = (segments + 1) * 2;
    this.pos = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
    this.nor = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
    this.uv = new THREE.BufferAttribute(new Float32Array(count * 2), 2);
    this.pos.setUsage(THREE.DynamicDrawUsage);
    this.nor.setUsage(THREE.DynamicDrawUsage);
    this.uv.setUsage(THREE.DynamicDrawUsage);

    this.setAttribute("position", this.pos);
    this.setAttribute("normal", this.nor);
    this.setAttribute("uv", this.uv);

    const idx: number[] = [];
    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
    this.setIndex(idx);
  }

  /**
   * Reconstrói a fita a partir dos pontos da corda.
   *
   * @param points  pontos ao longo da curva (segments + 1)
   * @param width   largura da fita em unidades de mundo
   * @param pitch   comprimento de um ladrilho da textura, em unidades de mundo
   */
  update(points: THREE.Vector3[], width: number, pitch: number) {
    const t = new THREE.Vector3();
    const w = new THREE.Vector3();
    const n = new THREE.Vector3();
    // Referência fixa para a direção da largura. Fixa, e não a câmera: é o
    // que faz a fita ser um objeto, com frente e verso estáveis.
    const ref = new THREE.Vector3(0, 0, 1);
    const half = width / 2;

    const p = this.pos.array as Float32Array;
    const nArr = this.nor.array as Float32Array;
    const uvArr = this.uv.array as Float32Array;

    let arc = 0;

    for (let i = 0; i < points.length; i++) {
      const cur = points[i];
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];

      t.subVectors(next, prev);
      if (t.lengthSq() < 1e-10) t.set(0, 1, 0);
      t.normalize();

      w.crossVectors(t, ref);
      // corda quase paralela à referência: usa outro eixo para não colapsar
      if (w.lengthSq() < 1e-6) w.crossVectors(t, new THREE.Vector3(1, 0, 0));
      w.normalize();

      n.crossVectors(w, t).normalize();

      if (i > 0) arc += cur.distanceTo(prev);
      const u = arc / pitch;

      const a = i * 2 * 3;
      p[a] = cur.x - w.x * half;
      p[a + 1] = cur.y - w.y * half;
      p[a + 2] = cur.z - w.z * half;
      p[a + 3] = cur.x + w.x * half;
      p[a + 4] = cur.y + w.y * half;
      p[a + 5] = cur.z + w.z * half;

      nArr[a] = n.x;
      nArr[a + 1] = n.y;
      nArr[a + 2] = n.z;
      nArr[a + 3] = n.x;
      nArr[a + 4] = n.y;
      nArr[a + 5] = n.z;

      const b = i * 2 * 2;
      uvArr[b] = u;
      uvArr[b + 1] = 0;
      uvArr[b + 2] = u;
      uvArr[b + 3] = 1;
    }

    this.pos.needsUpdate = true;
    this.nor.needsUpdate = true;
    this.uv.needsUpdate = true;
    this.computeBoundingSphere();
  }
}
