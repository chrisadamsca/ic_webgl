import { AttributeInfo, GLBuffer } from "../gl/GLBuffer";
import { gl } from "../gl/GLUtilities";
import { Shader } from "../gl/Shader";
import { Matrix4x4 } from "../math/matrix4x4";
import { Vector3 } from "../math/Vector3";
import { Material } from "./Material";
import { MaterialManager } from "./MaterialManager";
import { Vertex } from "./Vertex";

export class Sprite {

    protected _name: string;
    protected _width: number;
    protected _height: number;
    protected _origin: Vector3 = Vector3.zero;

    protected _buffer: GLBuffer;
    protected _materialName: string;
    protected _material: Material;
    protected _vertices: Vertex[] = [];

    public constructor(name: string, materialName: string, width: number = 100, height: number = 100) {
        this._name = name;
        this._width = width;
        this._height = height;
        this._materialName = materialName;

        this._material = MaterialManager.getMaterial(this._materialName);
    }

    public get name(): string {
        return this._name;
    }
    
    public get width(): number {
        return this._width;
    }

    public get height(): number {
        return this._height;
    }

    public get origin(): Vector3 {
        return this._origin;
    }

    public set origin(value: Vector3) {
        this._origin = value;
        this.recalculateVertices();
    }

    public destroy(): void {
        this._buffer.destroy();
        MaterialManager.releaseMaterial(this._materialName);
        this._material = undefined;
        this._materialName = undefined;
    }

    public load(): void {
        this._buffer = new GLBuffer();

        const positionAttributeInfo = new AttributeInfo();
        positionAttributeInfo.location = 0; // not dynamic! maybe look up the position of the positionattribute
        positionAttributeInfo.size = 3;
        this._buffer.addAttributeLocation(positionAttributeInfo);

        const texCoordAttributeInfo = new AttributeInfo();
        texCoordAttributeInfo.location = 1; // not dynamic! maybe look up the position of the positionattribute
        texCoordAttributeInfo.size = 2;
        this._buffer.addAttributeLocation(texCoordAttributeInfo);

        this.calculateVertices();

    }

    public update(time: number): void {

    }

    public draw(shader: Shader, model: Matrix4x4): void {

        const modelLocation = shader.getUniformLocation('u_model');
        gl.uniformMatrix4fv(modelLocation, false, model.toFloat32Array());

        // const colorLocation = shader.getUniformLocation('u_tint');
        // gl.uniform4fv(colorLocation, this._material.tint.toFloat32Array()); // uniform 4 float (v vector)

        if (this._material.diffuseTexture !== undefined) {
            this._material.diffuseTexture.activateAndBind(0);
        }
        const diffuseLocation = shader.getUniformLocation('u_diffuse');
        gl.uniform1i(diffuseLocation, 0);
        
        this._buffer.bind();
        this._buffer.draw();
    }

    protected calculateVertices(): void {
        const minX = - (this._width * this._origin.x);
        const maxX = this._width * (1.0 - this._origin.x);
        const minY = - (this._height * this._origin.y);
        const maxY = this._height * (1.0 - this._origin.y);


        this._vertices = [
            new Vertex(minX, minY, 0, 0,   0),
            new Vertex(minX, maxY, 0, 0,   1),
            new Vertex(maxX, maxY, 0, 0.5, 1),

            new Vertex(maxX, maxY, 0, 0.5, 1),
            new Vertex(maxX, minY, 0, 0.5, 0),
            new Vertex(minX, minY, 0, 0,   0)
        ];

        for (const vertex of this._vertices) {
            this._buffer.pushBackData(vertex.toArray());
        }

        this._buffer.upload();
        this._buffer.unbind();
    }

    protected recalculateVertices(): void {
        const minX = - (this._width * this._origin.x);
        const maxX = this._width * (1.0 - this._origin.x);
        const minY = - (this._height * this._origin.y);
        const maxY = this._height * (1.0 - this._origin.y);

        this._vertices[0].position.set(minX, minY);
        this._vertices[1].position.set(minX, maxY);
        this._vertices[2].position.set(maxX, maxY);

        this._vertices[3].position.set(maxX, maxY);
        this._vertices[4].position.set(maxX, minY);
        this._vertices[5].position.set(minX, minY);

        this._buffer.clearData();

        for (const vertex of this._vertices) {
            this._buffer.pushBackData(vertex.toArray());
        }

        this._buffer.upload();
        this._buffer.unbind();
    }

}