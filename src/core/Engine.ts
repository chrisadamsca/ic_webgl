import { AssetManager } from "./assets/AssetManager";
import { gl, GLUtilities } from "./gl/GLUtilities";
import { BasicShader } from "./gl/shaders/BasicShader";
import { Color } from "./graphics/Color";
import { Material } from "./graphics/Material";
import { MaterialManager } from "./graphics/MaterialManager";
import { Matrix4x4 } from "./math/matrix4x4";
import { MessageBus } from "./message/MessageBus";
import { LevelManager } from "./world/LevelManager";
import { SpriteComponentData } from "./components/SpriteComponent"
import { RotationBehaviorData } from "./behaviors/RotationBehavior";
import { AnimatedSpriteComponentData } from "./components/AnimatedSpriteComponent";
import { InputManager, MouseContext } from "./input/InputManager";
import { KeyboardMovementBehaviorData } from "./behaviors/KeyboardMovementBehavior";
import { IMessageHandler } from "./message/IMessageHandler";
import { Message } from "./message/Message";
import { AudioManager } from "./audio/AudioManager";
import { CollisionComponentData } from "./components/CollisionComponent";
import { CollisionManager } from "./collision/CollisionManager";
import { PlayerBehaviorData } from "./behaviors/PlayerBehavior";
import { importMath } from "./math/MathExtensions";
import { ScrollBehaviorData } from "./behaviors/ScrollBehavior";
import { Cube } from "./graphics/Cube";
import { CubeComponentData } from "./components/CubeComponent";
import { Vector3 } from "./math/Vector3";
import { AdvancedShader } from "./gl/shaders/AdvancedShader";
import { mat4 } from "gl-matrix";

const tempWebpackFixToIncludeSpriteTS = new SpriteComponentData();
const tempWebpackFixToIncludeAnimatedSpriteTS = new AnimatedSpriteComponentData();
const tempWebpackFixToIncludeColisionComponentTS = new CollisionComponentData();
const tempWebpackFixToIncludeRotationBehaviorTS = new RotationBehaviorData();
const tempWebpackFixToIncludeKeyboardMovementBehaviorTS = new KeyboardMovementBehaviorData();
const tempWebpackFixToIncludePlayerBehaviorTS = new PlayerBehaviorData();
const tempWebpackFixToIncludeScrollBehaviorTS = new ScrollBehaviorData();
const tempWebpackFixToIncludeCubeTS = new CubeComponentData();
const i = importMath;

export class Engine implements IMessageHandler{

    private _canvas: HTMLCanvasElement;
    private _basicShader: AdvancedShader;
    private _previousTime: number = 0;
    
    private _camera: Matrix4x4 = Matrix4x4.identity();

    // temporary:
    // private _projection: Matrix4x4;
    private _projection: mat4;
    private _projectionMatrix: mat4 = mat4.create();

    public constructor() {
        console.log('Engine created.');
    }

    public resize(): void {
        if (this._canvas) {
            this._canvas.width = window.innerWidth;
            this._canvas.height = window.innerHeight;

            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            
            // this._projection = Matrix4x4.orthographic(0, this._canvas.width, this._canvas.height, 0, -1000.0, 1000.0);
            this._projection = mat4.perspective(this._projectionMatrix, 45, this._canvas.width / this._canvas.height, 0.1, 10000);
        }
    }

    public onMessage(message: Message): void {
        if (message.code === 'MOUSE_UP') {
            const context = message.context as MouseContext;
            document.title = `Pos: [${context.position.x}, ${context.position.y}]`;
        }
    }

    public start(): Engine {
        console.log('Engine started.');

        AssetManager.initialize();
        InputManager.initialize();
        LevelManager.initialize();
        
        this._canvas = GLUtilities.initialize();
        this.resize();

        this._camera = Matrix4x4.multiply(this._camera, Matrix4x4.rotationXYZ(0, 0, 0));

        gl.clearColor(0, 0, 1, 1);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Load Shaders
        this._basicShader = new AdvancedShader();
        this._basicShader.use()

        // Load Materials
        MaterialManager.registerMaterial(new Material('bg', '/assets/textures/bg.png', Color.white()));
        MaterialManager.registerMaterial(new Material('cube', '/assets/textures/cube.png', Color.green()));

        // Load Sounds
        // AudioManager.loadSoundFile('flap', '/assets/sounds/flap.mp3');

        // this._projection = Matrix4x4.orthographic(0, this._canvas.width, this._canvas.height, 0, -1000.0, 1000.0);
        this._projection = mat4.perspective(this._projectionMatrix, 45, this._canvas.width / this._canvas.height, 0.1, 10000);

        LevelManager.changeLevel(0);

        setTimeout(() => {
            Message.send('GAME_START', this);
        }, 3000);
        
        this.loop();
        return this;
    }

    private loop(): void {
        this.update();
        this.render();
    }

    private update(): void {
        const delta = performance.now() - this._previousTime;
        
        MessageBus.update(delta);
        LevelManager.update(delta);
        CollisionManager.update(delta);

        this._previousTime = performance.now();
    }

    private render(): void {
        gl.clear(gl.COLOR_BUFFER_BIT); // ??? What is this? Resetting everything, but how?

        LevelManager.render(this._basicShader);

        const projectionLocation = this._basicShader.getUniformLocation('uProjectionMatrix');
        gl.uniformMatrix4fv(projectionLocation, false, this._projection);

        requestAnimationFrame(() => this.loop());
    }

}