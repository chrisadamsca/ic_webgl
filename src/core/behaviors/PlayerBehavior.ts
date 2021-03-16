import { AudioManager } from "../audio/AudioManager";
import { CollisionData } from "../collision/CollisionManager";
import { AnimatedSpriteComponent } from "../components/AnimatedSpriteComponent";
import { CollisionComponent } from "../components/CollisionComponent";
import { InputManager, Keys } from "../input/InputManager";
import { Vector2 } from "../math/Vector2";
import { Vector3 } from "../math/Vector3";
import { IMessageHandler } from "../message/IMessageHandler";
import { Message } from "../message/Message";
import { BaseBehavior } from "./BaseBehavior";
import { BehaviorManager } from "./BehaviorManager";
import { IBehavior } from "./IBehavior";
import { IBehaviorBuilder } from "./IBehaviorBuilder";
import { IBehaviorData } from "./IBehaviorData";

export class PlayerBehaviorData implements IBehaviorData {

    public name: string;
    public speed: number;
    // public acceleration: Vector2 = new Vector2(0, 920);
    public playerCollisionComponent: string;
    public groundCollisionComponent: string;
    public resetPosition: Vector3 = Vector3.zero;

    public setFromJSON(json: any): void {
        if (json.name === undefined) {
            throw new Error(`Name must be defined in BehaviorData.`)
        }

        this.name = String(json.name);

        if (json.resetPosition !== undefined) {
            this.resetPosition.setFromJSON(json.resetPosition);
        }

        if (json.speed !== undefined) {
            this.speed = Number(json.speed);
        }

        if (json.playerCollisionComponent === undefined) {
            throw new Error(`playerCollisionComponent must be defined in BehaviorData.`)
        } else {
            this.playerCollisionComponent = String(json.playerCollisionComponent);
        }
        
        if (json.groundCollisionComponent === undefined) {
            throw new Error(`groundCollisionComponent must be defined in BehaviorData.`)
        } else {
            this.groundCollisionComponent = String(json.groundCollisionComponent);
        }

    }

}

export class PlayerBehaviorBuilder implements IBehaviorBuilder {

    public get type(): string {
        return 'player';
    };

    public buildFromJSON(json: any): IBehavior {
        const data = new PlayerBehaviorData();
        data.setFromJSON(json);
        return new PlayerBehavior(data);
    }

}

export class PlayerBehavior extends BaseBehavior implements IMessageHandler {

    // private _acceleration: Vector2;
    private _nextVelocity: Vector3 = Vector3.zero;
    private _velocity: Vector3 = Vector3.zero;
    private _started: boolean = false;
    private _speed: number = 0.1;
    private _isAlive: boolean = true;
    private _playerCollisionComponent: string;
    private _groundCollisionComponent: string;
    private _initialPosition: Vector3 = Vector3.zero;
    private _resetPosition: Vector3 = Vector3.zero;

    private _collidingGround: {[key: number]: boolean} = {};

    private _isFalling: boolean = false;
    

    public constructor(data: PlayerBehaviorData) {
        super(data);
        
        this._resetPosition = data.resetPosition;
        this._groundCollisionComponent = data.groundCollisionComponent;
        this._playerCollisionComponent = data.playerCollisionComponent;
        this._speed = data.speed;

        Message.subscribe('KEY_DOWN', this);
        Message.subscribe('COLLISION_ENTRY::' + this._playerCollisionComponent, this);
        Message.subscribe('COLLISION_EXIT::' + this._playerCollisionComponent, this);
        Message.subscribe('GAME_RESET', this);
        Message.subscribe('GAME_START', this);
    }

    public onMessage(message: Message): void {

        switch (message.code) {
            case 'MOUSE_DOWN':
            case 'KEY_DOWN':
                this.start();
                if (InputManager.isKeyDown(Keys.LEFT) || InputManager.isKeyDown(Keys.A)) {
                    this._nextVelocity.set(-this._speed, 0, 0);
                }
                
                if (InputManager.isKeyDown(Keys.RIGHT) || InputManager.isKeyDown(Keys.D)) {
                    this._nextVelocity.set(this._speed, 0, 0);
                }
                
                if (InputManager.isKeyDown(Keys.UP) || InputManager.isKeyDown(Keys.W)) {
                    this._nextVelocity.set(0, 0, -this._speed);
                }
                
                if (InputManager.isKeyDown(Keys.DOWN) || InputManager.isKeyDown(Keys.S)) {
                    this._nextVelocity.set(0, 0, this._speed);
                }
                break;
            case 'COLLISION_ENTRY::' + this._playerCollisionComponent:
                const entryData = message.context as CollisionData;
                const entryOther = entryData.a.owner.id === this._owner.id ? entryData.b : entryData.a;
                // console.warn(`[Collision] ENTER into ground: ${entryOther.owner.id}`);
                if (entryOther.name === this._groundCollisionComponent) {
                    this._collidingGround[entryOther.owner.id] = true;
                }
                // console.warn('[Collision] touching ground ENTER', this._collidingGround);
                break;
            case 'COLLISION_EXIT::' + this._playerCollisionComponent:
                const exitData = message.context as CollisionData;
                const exitOther = exitData.a.owner.id === this._owner.id ? exitData.b : exitData.a;
                // console.warn(`[Collision] EXIT out of ground: ${exitOther.owner.id}`);
                if (exitOther.name === this._groundCollisionComponent) {
                    delete this._collidingGround[exitOther.owner.id];
                    // console.warn('[Collision] touching ground EXIT', this._collidingGround);
                    if (Object.keys(this._collidingGround).length < 1) {
                        // console.warn('[Collision] DEAD');
                        this.die();
                    }
                }
                break;
            case 'GAME_RESET':
                this.reset();
                break;
            case 'GAME_START':
                this.start();
                break;
            default:
                break;
        }
    }

    public updateReady(): void {
        super.updateReady();

        this._initialPosition.copyFrom(this._owner.transform.position);

    }

    public update(time: number): void {
        const seconds = time / 1000;

        if (this._started && this._isFalling) {
            this._owner.transform.position.add(new Vector3(0, -this._speed * 2, 0));
        }

        
        
        if (this._nextVelocity.x !== 0) {
            const ownerPositionZ = this._owner.transform.position.z;
            let deviationFromGrid = Math.abs(ownerPositionZ % 1);
            deviationFromGrid = deviationFromGrid >= 0.5 ? (1 - deviationFromGrid) : deviationFromGrid;
            if ( deviationFromGrid < 0.2) {
                this._owner.transform.position.z = Math.round(ownerPositionZ);
                this._velocity.copyFrom(this._nextVelocity);
            }
        } else if (this._nextVelocity.z !== 0) {
            const ownerPositionX = this._owner.transform.position.x;
            let deviationFromGrid = Math.abs(ownerPositionX % 1);
            deviationFromGrid = deviationFromGrid >= 0.5 ? (1 - deviationFromGrid) : deviationFromGrid;
            if ( deviationFromGrid < 0.2) {
                this._owner.transform.position.x = Math.round(this._owner.transform.position.x);
                this._velocity.copyFrom(this._nextVelocity);
            }
        }


        // if (this._nextVelocity.x !== 0) {
        //     if (this._velocity.z % 1 < 0.01 ) {
                
        //     }
        //     const nearlyOnGrid = this._owner.transform.position.z % 1 < 0.01 || this._owner.transform.position.z % 1 > 0.99;
        //     if (nearlyOnGrid) {
        //         this._owner.transform.position.set(this._owner.transform.position.x, this._owner.transform.position.y, Math.round(this._owner.transform.position.z));
        //     }
        //     this._velocity.copyFrom(this._nextVelocity);
        // }
        // if (this._nextVelocity.z !== 0) {
        //     const nearlyOnGrid = this._owner.transform.position.x % 1 < 0.01 || this._owner.transform.position.x % 1 > 0.99;
        //     if (nearlyOnGrid) {
        //         this._owner.transform.position.set(Math.round(this._owner.transform.position.x), this._owner.transform.position.y, this._owner.transform.position.z);
        //     }
        //     this._velocity.copyFrom(this._nextVelocity);
        // }

        if (this._isAlive) {
            this._owner.transform.position.add(this._velocity);
        }

        if (this._owner.transform.position.y < -10) {
            this.reset();
        }


        // // Limit max speed
        // if (this._velocity.y > 400) {
        //     this._velocity.y = 400;
        // }

        // Prevent flying to high
        // if (this._owner.transform.position.y < -13) {
        //     this._owner.transform.position.y = -13;
        //     this._velocity.y = 0;
        // }
        
        // this._owner.transform.position.add(this._velocity.clone().scale(seconds).toVector3());
        // this._owner.transform.position.add(new Vector3(0, 1, 0));

        // if (this._velocity.y < 0) {
        //     this._owner.transform.rotation.z -= (Math as any).degToRad(600.0) * seconds;
        //     if (this._owner.transform.rotation.z < (Math as any).degToRad(-20)) {
        //         this._owner.transform.rotation.z = (Math as any).degToRad(-20);
        //     }
        // }

        // if (this.isFalling || !this._isAlive) {
        //     this._owner.transform.rotation.z += (Math as any).degToRad(480.0) * seconds;
        //     if (this._owner.transform.rotation.z > (Math as any).degToRad(90)) {
        //         this._owner.transform.rotation.z = (Math as any).degToRad(90);
        //     }
        // }

        super.update(time);
    }

    private die(): void {
        if (this._isAlive) {
            this._isFalling = true;
            this._isAlive = false;
            // AudioManager.playSound('dead');
            Message.send('PLAYER_DIED', this);
        }
    }

    private reset(): void {
        this._owner.transform.position.copyFrom(this._resetPosition);
        this._velocity = Vector3.zero;
        this._nextVelocity = Vector3.zero;
        this._isAlive = true;
        this._isFalling = false;
        this.start()
        // this._isPlaying = false;
        // this._sprite.owner.transform.position.copyFrom(this._initialPosition);
        // this._sprite.owner.transform.rotation.z = 0;
        // this.owner.transform.rotation.z = 0;

        // this._velocity.set(0, 0);
        // this._acceleration.set(0, 920);
        // this._sprite.play();
    }

    private start(): void {
        if (!this._started) {
            console.warn('#### STARTING');
            this._started = true;
        }
        // Message.send('PLAYER_RESET', this);
    }

    private decelerate(): void {
        // this._acceleration.y = 0;
        // this._velocity.y = 0;
    }


    private onRestart(y: number): void {
        this._owner.transform.rotation.z = 0;
        this._owner.transform.position.set(33, y);
        // this._velocity.set(0, 0);
        // this._acceleration.set(0, 920);
        this._isAlive = true;
        // this._sprite.play();
    }

}

BehaviorManager.registerBuilder(new PlayerBehaviorBuilder());