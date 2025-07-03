/**
 * MakeCode editor extension for DHT11 and DHT22 humidity/temperature sensors
 * by Alan Wang
 */

enum DHTtype {
    //% block="DHT11"
    DHT11,
    //% block="DHT22"
    DHT22,
}

enum dataType {
    //% block="humidity"
    humidity,
    //% block="temperature"
    temperature,
}

enum tempType {
    //% block="Celsius (*C)"
    celsius,
    //% block="Fahrenheit (*F)"
    fahrenheit,
}

//% block="DHT11/DHT22" weight=100 color=#ff8f3f icon="\uf043"
namespace dht11_dht22 {

    let _temperature: number = -999.0
    let _humidity: number = -999.0
    let _temptype: tempType = tempType.celsius
    let _readSuccessful: boolean = false
    let _sensorresponding: boolean = false

    /**
    * Query data from DHT11/DHT22 sensor. If you are using 4 pins/no PCB board versions, you'll need to pull up the data pin. 
    * It is also recommended to wait 1 (DHT11) or 2 (DHT22) seconds between each query.
    */
    //% block="Query $DHT|Data pin $dataPin|Pin pull up $pullUp|Serial output $serialOtput|Wait 2 sec after query $wait"
    //% pullUp.defl=true
    //% serialOtput.defl=false
    //% wait.defl=true
    //% blockExternalInputs=true
   export function queryData(DHT: DHTtype, dataPin: DigitalPin, pullUp: boolean, serialOtput: boolean, wait: boolean) {
    const TIMEOUT = 10000;

    let bits: number[] = [0, 0, 0, 0, 0];
    let humidity = -999;
    let temperature = -999;

    _readSuccessful = false;
    _sensorresponding = false;

    _humidity = humidity;
    _temperature = temperature;

    // Step 1: Send start signal
    pins.digitalWritePin(dataPin, 0);
    basic.pause(18);
    pins.digitalWritePin(dataPin, 1);
    pins.setPull(dataPin, PinPullMode.PullUp);
    control.waitMicros(40);
    pins.digitalReadPin(dataPin); // switch to input

    // Step 2: Wait for response
    let loopCnt = TIMEOUT;
    while (pins.digitalReadPin(dataPin) == 0) {
        if (--loopCnt == 0) return;
    }

    loopCnt = TIMEOUT;
    while (pins.digitalReadPin(dataPin) == 1) {
        if (--loopCnt == 0) return;
    }

    // Step 3: Read 40 bits
    let cnt = 7;
    let idx = 0;

    for (let i = 0; i < 40; i++) {
        loopCnt = TIMEOUT;
        while (pins.digitalReadPin(dataPin) == 0) {
            if (--loopCnt == 0) return;
        }

        let t = input.runningTimeMicros();

        loopCnt = TIMEOUT;
        while (pins.digitalReadPin(dataPin) == 1) {
            if (--loopCnt == 0) return;
        }

        let pulse = input.runningTimeMicros() - t;

        if (pulse > 40) {
            bits[idx] |= (1 << cnt);
        }

        if (cnt == 0) {
            cnt = 7;
            idx++;
        } else {
            cnt--;
        }
    }

    // Step 4: Extract values
    let checksum = bits[0] + bits[2];

    _humidity = bits[0];
    _temperature = bits[2];

    _sensorresponding = true;

    if (bits[4] == (checksum & 0xFF)) {
        _readSuccessful = true;
    }

    if (serialOtput) {
        serial.writeLine((DHT == DHTtype.DHT11 ? "DHT11" : "DHT22") + " query");
        serial.writeLine(_readSuccessful ? "Checksum ok" : "Checksum error");
        serial.writeLine("Humidity: " + _humidity + " %");
        serial.writeLine("Temperature: " + _temperature + (_temptype == tempType.celsius ? " *C" : " *F"));
        serial.writeLine("----------------------------------------");
    }

    if (wait) basic.pause(2000);
}



    /**
    * Read humidity/temperature data from lastest query of DHT11/DHT22
    */
    //% block="Read $data"
    export function readData(data: dataType): number {
        return data == dataType.humidity ? _humidity : _temperature
    }

    /**
    * Select temperature type (Celsius/Fahrenheit)"
    */
    //% block="Temperature type: $temp" advanced=true
    export function selectTempType(temp: tempType) {
        _temptype = temp
    }

    /**
    * Determind if last query is successful (checksum ok)
    */
    //% block="Last query successful?"
    export function readDataSuccessful(): boolean {
        return _readSuccessful
    }

    /**
    * Determind if sensor responded successfully (not disconnected, etc) in last query
    */
    //% block="Last query sensor responding?" advanced=true
    export function sensorrResponding(): boolean {
        return _sensorresponding
    }

}
