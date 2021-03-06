//chocobit 2018/11/13
//% color="#f97c04" weight=25 icon="\uf1b9"
namespace ChocoCar {

    const PCA9685_ADD = 0x41
    const MODE1 = 0x00
    const MODE2 = 0x01
    const SUBADR1 = 0x02
    const SUBADR2 = 0x03
    const SUBADR3 = 0x04

    const LED0_ON_L = 0x06
    const LED0_ON_H = 0x07
    const LED0_OFF_L = 0x08
    const LED0_OFF_H = 0x09

    const ALL_LED_ON_L = 0xFA
    const ALL_LED_ON_H = 0xFB
    const ALL_LED_OFF_L = 0xFC
    const ALL_LED_OFF_H = 0xFD

    const PRESCALE = 0xFE

    let initialized = false
    let turn_off = false
    let straight_correct = 1
    export enum enServo {
        //blockId=servo_s1 block="接口1"
        S1 = 1,
        //blockId=servo_s2 block="接口2"
        S2,
        //blockId=servo_s3 block="接口3"
        S3,
        //blockId=servo_s4 block="接口4"
        S4
    }
    
    export enum CarState {
        //% blockId="Car_Run" block="前进"
        Car_Run = 1,
        //% blockId="Car_Back" block="后退"
        Car_Back = 2,
        //% blockId="Car_Left" block="左转"
        Car_Left = 3,
        //% blockId="Car_Right" block="右转"
        Car_Right = 4,
        //% blockId="Car_Stop" block="停止"
        Car_Stop = 5,
        //% blockId="Car_SpinLeft" block="原地左转"
        Car_SpinLeft = 6,
        //% blockId="Car_SpinRight" block="原地右转"
        Car_SpinRight = 7
    }
    function i2cwrite(addr: number, reg: number, value: number) {
        let buf = pins.createBuffer(2)
        buf[0] = reg
        buf[1] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    function i2ccmd(addr: number, value: number) {
        let buf = pins.createBuffer(1)
        buf[0] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    function i2cread(addr: number, reg: number) {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        let val = pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
        return val;
    }

    function initPCA9685(): void {
        i2cwrite(PCA9685_ADD, MODE1, 0x00)
        setFreq(50);
        initialized = true
    }
    
    function setFreq(freq: number): void {
        // Constrain the frequency
        let prescaleval = 25000000;
        prescaleval /= 4096;
        prescaleval /= freq;
        prescaleval -= 1;
        let prescale = prescaleval; //Math.Floor(prescaleval + 0.5);
        let oldmode = i2cread(PCA9685_ADD, MODE1);
        let newmode = (oldmode & 0x7F) | 0x10; // sleep
        i2cwrite(PCA9685_ADD, MODE1, newmode); // go to sleep
        i2cwrite(PCA9685_ADD, PRESCALE, prescale); // set the prescaler
        i2cwrite(PCA9685_ADD, MODE1, oldmode);
        control.waitMicros(5000);
        i2cwrite(PCA9685_ADD, MODE1, oldmode | 0xa1);
    }
    
    function setPwm(channel: number, off: number): void {
        if (channel < 0 || channel > 15)
            return;
        if (!initialized) {
            initPCA9685();
        }
        let buf = pins.createBuffer(5);
        buf[0] = LED0_ON_L + 4 * channel;
        buf[1] = 0x00;
        buf[2] = 0x00;
        buf[3] = off & 0xff;
        buf[4] = (off >> 8) & 0xff;
        pins.i2cWriteBuffer(PCA9685_ADD, buf);
    }

    function RGB_init(): void{
        neopixel.create(5, 12, 0)
    }

    //% blockId=Choco_init block="初始化智能车" color="#d43717"
    //% weight=99
    export function Choco_init() {
        initPCA9685()
        move(0, 0)
        pins.setPull(DigitalPin.P1, PinPullMode.PullUp)
        pins.setPull(DigitalPin.P2, PinPullMode.PullUp)
        pins.setPull(DigitalPin.P8, PinPullMode.PullUp)
        pins.setPull(DigitalPin.P12, PinPullMode.PullUp)
        pins.setPull(DigitalPin.P14, PinPullMode.PullUp)
        pins.setPull(DigitalPin.P15, PinPullMode.PullUp)
        music.playTone(262, music.beat(BeatFraction.Quarter))
        music.playTone(330, music.beat(BeatFraction.Quarter))
        music.playTone(392, music.beat(BeatFraction.Half))
        music.playTone(523, music.beat(BeatFraction.Half))

    }

    //% blockId=Choco_move block="设置电机速度 左轮 %leftspeed |右轮 %rightspeed" weight=90
    //% leftspeed.min=-100 lelftspeed.max=100
    //% rightspeed.min=-100 rightspeed.max=100
    export function move(leftspeed: number, rightspeed: number) {
        leftspeed = leftspeed>100?100:leftspeed<-100?-100:leftspeed;
        rightspeed = rightspeed>100?100:rightspeed<-100?-100:rightspeed;
        leftspeed =leftspeed*256/100*16
        rightspeed =rightspeed*256/100*16
        if (rightspeed >= 0)
        {
            setPwm(0, rightspeed-1)   //智能车右轮为1，0通道
            setPwm(1, 0)            
        }
        else
        {
            setPwm(0, 0)
            setPwm(1, -rightspeed-1)
        }
        if (leftspeed >= 0)
        {
            setPwm(2, leftspeed-1)
            setPwm(3, 0)    
        }
        else
        {
            setPwm(2, 0)
            setPwm(3, -leftspeed-1)
        }

    }
    //% blockId=Choco_CarCtrl block="智能车移动控制|%index"
    //% weight=93
    //% 
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=10
    export function CarCtrl(index: CarState): void {
        switch (index) {
            case CarState.Car_Run: move(100, 100); break;
            case CarState.Car_Back: move(-100, -100); break;
            case CarState.Car_Left: move(0, 100); break;
            case CarState.Car_Right: move(100, 0); break;
            case CarState.Car_Stop: move(0, 0); break;
            case CarState.Car_SpinLeft: move(-100, 100); break;
            case CarState.Car_SpinRight: move(100, -100); break;
        }
    }
    //% blockId=Choco_CarCtrlSpeed block="智能车移动控制|%index|速度 %speed"
    //% weight=92
    //% 
    //% speed.min=0 speed.max=100
    //% index.fieldEditor="gridpicker" index.fieldOptions.columns=10
    export function CarCtrlSpeed(index: CarState, speed: number): void {
        switch (index) {
            case CarState.Car_Run: move(speed*staright_correct, speed/staright_correct); break;
            case CarState.Car_Back: move(-speed*staright_correct, -speed/staright_correct); break;
            case CarState.Car_Left: move(speed*3/5, speed); break;
            case CarState.Car_Right: move(speed, speed*3/5); break;
            case CarState.Car_Stop: move(0, 0); break;
            case CarState.Car_SpinLeft: move(-speed, speed); break;
            case CarState.Car_SpinRight: move(speed, -speed); break;
        }
    }

    //% block="设置直行修正参数%correct|%"
    //% correct.defl=100 correct.min=50 correct.max=150
    //% weight=91
    export function Set_straight_correct(correct:number){
        staright_correct=correct/100;
        return
    }
    //% blockId=Choco_Servo block="舵机控制|编号 %num|角度 %value"
    //% weight=80
    //% advanced=true
    //% value.min=0 value.max=180
    //% num.fieldEditor="gridpicker" num.fieldOptions.columns=4
    export function Servo(num: enServo, value: number): void {

        // 50hz: 20,000 us
        let us = (value * 1800 / 180 + 600); // 0.6 ~ 2.4
        let pwm = us * 4096 / 20000;
        setPwm(num + 10, pwm);      //

    }

    //% blockId=Choco_bus_Servo block="总线舵机控制|ID %ID|角度 %value|时间 %time ms"
    //% weight=79 color="#a5a5a5"
    //% time.defl=500 time.min=0
    //% value.min=0 value.max=180
    //% num.fieldEditor="gridpicker" num.fieldOptions.columns=4
    //% advanced=true
    export function bus_Servo(ID: number, value: number, time: number): void {

        // 50hz: 20,000 us
        let us = (value * 2000 / 180 + 500); // 0.5 ~ 2.5
        serial.writeString('#00');
        serial.writeNumber(ID);
        serial.writeString('P');
        if (us < 1000)
        {
            serial.writeString('0');
            serial.writeNumber(us);    
        }
        else
            serial.writeNumber(us);
        serial.writeString('T');
        if (time < 1000)
        {
            serial.writeString('0');
            serial.writeNumber(time);    
        }
        else
            serial.writeNumber(time);
        serial.writeString('!');

    }
    export enum Servo_mode{
        //% blockId=bus_Servo_mode_1 block="顺时针270°"
        CW270 = 1,
        //% blockId=bus_Servo_mode_2 block="逆时针270°"
        CCW,
        //% blockId=bus_Servo_mode_3 block="顺时针180°"
        CW180,
        //% blockId=bus_Servo_mode_4 block="逆时针180°"
        CCW180,
        //% blockId=bus_Servo_mode_5 block="顺时针圈数"
        CWN,
        //% blockId=bus_Servo_mode_6 block="逆时针圈数"
        CCWN,
        //% blockId=bus_Servo_mode_7 block="顺时针时间"
        CWT,
        //% blockId=bus_Servo_mode_8 block="逆时针时间"
        CCWT
    }

    //% blockId=Choco_bus_Servo_mode block="设置总线舵机模式|ID %ID| %mode"
    //% weight=78 color="#a5a5a5"
    //% advanced=true
    export function bus_Servo_mode(ID: number, mode: Servo_mode): void{
        serial.writeString('#00');
        serial.writeNumber(ID);
        serial.writeString('PMOD');
        serial.writeNumber(mode);
        serial.writeString('!');
        let ret = serial.readUntil('!');
        if (ret == '#OK')
            basic.showIcon(IconNames.Yes)
        else
            basic.showIcon(IconNames.No)
    }



    export enum IR_sensor{
        //% blockId=IR_Left2 block="左后"
        Left1 = 0,
        //% blockId=IR_Left1 block="左前"
        Left2,
        //% blockId=IR_Right1 block="右前"
        Right1,
        //% blockId=IR_Right2 block="右后"
        Right2

    }
    export enum IR_state{
        //% blockId=IR_black block="黑"
        black = 0,
        //% blockId=IR_white block="白"
        white = 1
    }
    export enum enTouch {
        //% blockId=NoTouch block="未触摸"
        NoTouch = 0,
        //% blockId=Touch block="触摸"
        Touch = 1
    }
    //% blockId=Choco_touch block="检测到触摸输入" weight=15 color="#3d85c6" icon="\uf2f6"
    export function read_touch(): boolean{
        if (pins.digitalReadPin(DigitalPin.P15) == 1) {
            return true;
        }
        else {
            return false;
        }
    }
    //% blockId=Choco_touch_event block="当检测到触摸输入时" weight=15 color="#3d85c6" icon="\uf2f6"
    export function onTouch(body: () => void):void {

    }
    //% blockId=Choco_IRsensor block="循线传感器 %n |检测到 %state"
    //% n.fieldEditor="gridpicker" n.fieldOptions.columns=4 color="#3d85c6" icon="\uf2f6"
    export function read_IRsensor(n: IR_sensor,state:IR_state): boolean{
        let pin = 0;
        switch (n) {
            case IR_sensor.Left1: pin = DigitalPin.P2; break;
            case IR_sensor.Left2: pin = DigitalPin.P12; break;
            case IR_sensor.Right1: pin = DigitalPin.P8; break;
            case IR_sensor.Right2: pin = DigitalPin.P1; break;
        }
        if (pins.digitalReadPin(pin) == state) {
            return true;
        }
        else {
            return false;
        }
    }

    //% blockId=Choco_ultrasonic block="超声波测距值"
    //% color="#3d85c6" icon="\uf2f6"
    //% weight=20
    //% 
    export function Ultrasonic(): number {

        // send pulse
        pins.setPull(DigitalPin.P14, PinPullMode.PullUp);
        pins.digitalWritePin(DigitalPin.P16, 0);
        control.waitMicros(2);
        pins.digitalWritePin(DigitalPin.P16, 1);
        control.waitMicros(15);
        pins.digitalWritePin(DigitalPin.P16, 0);

        // read pulse
        let d = pins.pulseIn(DigitalPin.P14, PulseValue.High, 23200);
        return d / 58;
    }

    //% blockId=Choco_rainbowlight block="启动流水灯 流动速度 %v |亮度 %brightness"
    //% weight=1 color="#6aa84f" icon="\uf0eb"
    //% v.defl=1 
    //% brightness.defl=1
    //% v.min=1 v.max=5 
    //% brightness.min=1 brightness.max=5
    export function rainbowlight(v: number, brightness: number) {
        let head: neopixel.Strip = null
        let RGB: neopixel.Strip = null
        turn_off = false
        RGB = neopixel.create(DigitalPin.P5, 12, NeoPixelMode.RGB)
        RGB.setBrightness(10 * brightness)
        RGB.showRainbow(1, 360)
        control.inBackground(() => {
            while (!turn_off) {
                RGB.showRainbow(1, 360)
                for (let index = 0; index <= 11; index++) {
                    RGB.shift(1)
                    RGB.show()
                    head = RGB.range(0, index + 1)
                    head.showRainbow(360 - 30 * index, 330)
                    basic.pause(500 / v)
                }
            }
            RGB.clear();
            RGB.show();
            basic.pause(100);
            pins.digitalReadPin(DigitalPin.P5)
            pins.setPull(DigitalPin.P5, PinPullMode.PullUp)

        })
    }
    //% blockId=Choco_rainbowlight_off block="关闭流水灯"
    //% weight=1 color="#6aa84f" icon="\uf0eb"
    export function turnoff_rainbowlight() {
        turn_off = true
    }
}
