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

    // Initialize
    let startTime: number = 0
    let endTime: number = 0
    let checksum: number = 0
    let checksumTmp: number = 0
    let dataArray: boolean[] = []
    let resultArray: number[] = []
    let DHTstr: string = (DHT == DHTtype.DHT11) ? "DHT11" : "DHT22"

    for (let index = 0; index < 40; index++) dataArray.push(false)
    for (let index = 0; index < 5; index++) resultArray.push(0)

    _humidity = -999.0
    _temperature = -999.0
    _readSuccessful = false
    _sensorresponding = false
    startTime = input.runningTimeMicros()

    // Step 1: MCU sends start signal
    pins.digitalWritePin(dataPin, 0) // Pull pin LOW
    basic.pause(18)

    // Step 2: MCU releases the bus (set pin HIGH + pull-up)
    pins.digitalWritePin(dataPin, 1)
    if (pullUp) pins.setPull(dataPin, PinPullMode.PullUp)
    control.waitMicros(40)

    // Step 3: Wait for sensor response (LOW then HIGH)
    if (pins.digitalReadPin(dataPin) == 1) {
        if (serialOtput) {
            serial.writeLine(DHTstr + " not responding!")
            serial.writeLine("----------------------------------------")
        }
        return
    }

    _sensorresponding = true

    while (pins.digitalReadPin(dataPin) == 0); // wait LOW
    while (pins.digitalReadPin(dataPin) == 1); // wait HIGH

    // Step 4: Read 40 bits (5 bytes)
    for (let index = 0; index < 40; index++) {
        while (pins.digitalReadPin(dataPin) == 0); // wait for bit start
        let t = input.runningTimeMicros()
        while (pins.digitalReadPin(dataPin) == 1); // measure HIGH duration
        let duration = input.runningTimeMicros() - t

        if (duration > 50) {
            dataArray[index] = true // bit = 1
        } else {
            dataArray[index] = false // bit = 0
        }
    }

    endTime = input.runningTimeMicros()

    // Convert bits to bytes
    for (let index = 0; index < 5; index++) {
        for (let index2 = 0; index2 < 8; index2++) {
            if (dataArray[8 * index + index2]) resultArray[index] += 2 ** (7 - index2)
        }
    }

    // Verify checksum
    checksumTmp = resultArray[0] + resultArray[1] + resultArray[2] + resultArray[3]
    checksum = resultArray[4]
    if (checksumTmp >= 512) checksumTmp -= 512
    if (checksumTmp >= 256) checksumTmp -= 256
    if (checksum == checksumTmp) _readSuccessful = true

    // Read values (even if checksum fails)
    if (true) {
        if (DHT == DHTtype.DHT11) {
            _humidity = resultArray[0]
            _temperature = resultArray[2]
        } else {
            let temp_sign: number = 1
            if (resultArray[2] >= 128) {
                resultArray[2] -= 128
                temp_sign = -1
            }
            _humidity = (resultArray[0] * 256 + resultArray[1]) / 10
            _temperature = (resultArray[2] * 256 + resultArray[3]) / 10 * temp_sign
        }
        if (_temptype == tempType.fahrenheit)
            _temperature = _temperature * 9 / 5 + 32
    }

    // Serial output
    if (serialOtput) {
        serial.writeLine(DHTstr + " query completed in " + (endTime - startTime) + " microseconds")
        if (_readSuccessful) {
            serial.writeLine("Checksum ok")
        } else {
            serial.writeLine("Checksum error")
        }
        serial.writeLine("Humidity: " + _humidity + " %")
        serial.writeLine("Temperature: " + _temperature + (_temptype == tempType.celsius ? " *C" : " *F"))
        serial.writeLine("----------------------------------------")
    }

    // Optional wait
    if (wait) basic.pause(2000)
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
