declare module "onnxruntime-node" {
  export class Tensor {
    constructor(type: string, data: BigInt64Array | Float32Array, dims: number[]);
    data: Float32Array | BigInt64Array;
    dims: number[];
  }

  export class InferenceSession {
    static create(modelPath: string): Promise<InferenceSession>;
    run(
      feeds: Record<string, Tensor>,
    ): Promise<Record<string, { data: Float32Array; dims: number[] }>>;
  }
}
