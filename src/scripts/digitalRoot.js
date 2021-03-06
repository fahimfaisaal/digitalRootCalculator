import Animations from './Animations';
import DisplayResults from './displayResult';
import Utility from './utility';

const { isHtmlElement } = Utility;

class DigitalRoot {
    #staticPattern;
    #dynamicPattern;
    #results;
    #previousValue;
    #animations;
    
    constructor(input = null, resultNode = null) {
        this.input = input;
        this.resultNode = resultNode;
        this.errors = {};

        // private props
        this.#previousValue = '';
        this.#staticPattern = [
            {
                regex: /^,/,
                replace: ''
            },
            {
                regex: /,{2,}/g,
                replace: ','
            },
            {
                regex: /\.{2,}/g,
                replace: '.'
            },
            {
                regex: /(\.\d+)\./g,
                replace: '$1'
            },
            {
                regex: /[^\d,\.]/g,
                replace: ''
            }
        ];
        this.#dynamicPattern = [
            {
                regex: /-{2,}/,
                replace: '-'
            },
            {
                regex: /(\d+-)\D+/,
                replace: '$1'
            },
            {
                regex: /(\d+-\d+)[^*^/+\d]+/,
                replace: '$1'
            },
            {
                regex: /(\d+-\d+[*^/+])\D+/,
                replace: '$1'
            },
            {
                regex: /(\d+-\d+[+*^\/]\d+)\D+/,
                replace: '$1'
            }
        ];
        this.#results = {};
        this.#animations = new Animations();
    }

    /**
     * @param {string} value
     * @returns string
     * @description it's validate in two pattern static and dynamic and return only string of numbers
    */
    #validateInput(value) {
        let patterns = this.#staticPattern;

        if (/^\d+-/.test(value)) {
            patterns = this.#dynamicPattern;
        }

        return patterns
            .reduce((value, pattern) => value.replace(pattern.regex, pattern.replace), value);
    };


    /**
     * @param {number} number
     * @returns {object result<string>, calculation<array[][]>} digital root of 56 -> [['5 + 6', '11'], ['1 + 1', '2']]
     * @description split the calculation into 2D array and return an object with two props
    */
    #getDigitalRootObj(num, rootObjStruct = { resultString: '', calculationArr: [] }) {
        if (num === undefined) {
            return {};
        }

        num = num.replace(/\./g, ''); // replace all dots for floating number
        const splitNum = [...("" + BigInt(num))]; // split number to arr of string

        // create root object with two properties like { result: number(the digital root of num), calculation: string(representing the calculation process)}
        const rootObj = splitNum.reduce((acc, cur, index) => {
            acc.result += BigInt(cur);
            acc.calculationString += `${cur}${index === splitNum.length - 1 ? '' : '+'}`; // calculation String

            return acc;
        }, { result: 0n, calculationString: '' });

        const { result, calculationString } = rootObj;

        rootObjStruct.resultString = result.toString();
        rootObjStruct.calculationArr.push([calculationString, rootObjStruct.resultString]);

        if (rootObj.result > 9) {
            // if result is greater then 9 then again split the number
            const { resultString } = rootObjStruct;

            return this.#getDigitalRootObj(resultString, rootObjStruct);
        }

        return rootObjStruct;
    }

    /**
     * @description remove the rangeError key from error object if exist
     */
    #removeError() {
        'rangeError' in this.errors && delete this.errors.rangeError;
    }

    /**
     * @param {number} start 
     * @param {number} end 
     * @param {number} cal 
     * @param {string} operator 
     * @returns {string} 
     * @description if user input is dynamic pattern then it's this method generate string of numbers via user input range
     */
    #calculateDynamicRange(start, end, cal, operator = '+') {
        if (end < start || start === end) {
            this.errors.rangeError = 'Please input the ascending range';

            return [start + '', end + ''];
        }
        
        const numbers = [];

        cal ||= 1;

        const [startBigInt, endBigInt, calBigInt] = [BigInt(start), BigInt(end), BigInt(cal)]; // converted to BigInt

        const actions = {
            '+': () => {
                for (let number = startBigInt; number <= endBigInt; number += calBigInt) {
                    numbers.push(number + '');
                }
            },
            '*': () => {
                let base = startBigInt;

                for (let number = startBigInt; number <= endBigInt; number++) {
                    numbers.push(base + '');
                    base *= calBigInt
                }
            },
            '/': () => {
                let base = start;

                for (let number = start; number <= end; number++) {
                    base /= cal;
                    numbers.push(base + '');
                }
            },
            '^': () => {
                for (let number = start; number <= end; number++) {
                    numbers.push(Math.pow(number, cal) + '');
                }
            }
        }

        this.#removeError();

        const selectedAction = actions[operator];

        selectedAction();

        return numbers;
    }

    /**
     * @param {string} value 
     * @returns {array}
     * @description it returns the array version of the user input
     */
    #runDynamicRange(value) {
        const [start, end, cal] = value.split(/[*+/^-]/g);
        const [, operator] = value.split(/\d+/).filter(item => item !== '');

        if (start && end) {
            value = this.#calculateDynamicRange(+start, +end, +cal, operator);
            return value;
        }

        return [];
    }

    /**
     * @param {array} numbers 
     * @returns {object} state results
     * @description it's modify the result object by user input
     */
    #parseToObject(numbers) {
        const length = numbers.length;

        if (!length) {
            return this.#results;
        }

        // if input multiple numbers
        if (length > 1) {
            const newResults = numbers.reduce((multiNumberObj, number) => {
                multiNumberObj[number] = this.#getDigitalRootObj(number);
                return multiNumberObj;
            }, {})

            this.#results = newResults;


            return this.#results;
        }

        this.#removeError();

        this.#results = {} // delete the previous input numbers

        const [number] = numbers;
        this.#results[number] = this.#getDigitalRootObj(number);

        return this.#results;
    }

    /**
     * @param {string} value 
     * @returns {array}
     * @description split the value by condition is the value are dynamic or static
     */
    #valueOrganizer(value) {
        if (/^\d+-/.test(value)) {
            return this.#runDynamicRange(value);
        }
        
        return value.split(',');
    }

    /**
     * @param {Object} event 
     * @returns undefined
     * @description handle the event listener
     */
    #inputEventHandler = (event) => {
        // validate the user input only valid number
        const value = this.#validateInput(event.target.value);
        event.target.value = value; // assign the validate value to the input value

        // if previous value and present value are same then return mean not run
        if (this.#previousValue === value || /[,\-]/.test(value[value.length - 1])) {
            return
        }

        // the result animation
        const resultFadeInTween = this.#animations.fadeInOutTween(this.resultNode);
        // placeholder animation
        if (value) {
            this.#animations.placeholderTimeline.pause();
            resultFadeInTween.play();
        } else {
            this.#animations.placeholderTimeline.play();
            resultFadeInTween.reverse();
        }

        // assigned the new value to the recent value
        this.#previousValue = value;

        const values = this.#valueOrganizer(value); // it will be array

        // get the digital root of value
        const parsedObject = this.#parseToObject(values);

        // create the instance of DisplayResults class
        const display = new DisplayResults(parsedObject);
        const markup = display.generateMarkup(); // generate the markup via parsed object

        if ("" in parsedObject) {
            this.resultNode.innerHTML = '';
        } else {
            const isError = 'rangeError' in this.errors;
            const rangeErrorMarkup = `<h4 class="error">${this.errors?.rangeError}</h4>`;

            this.resultNode.innerHTML = isError ? rangeErrorMarkup : markup;
                    
            // result fadeout up animation
            !isError && this.#animations.fadeOutUp('.result');
        }
    }

    /**
     * @param {string} eventType
     * @return {boolean} 
     * @description send the state results in input event listener
    */
    runInputEvent() {
        // run the intro animations
        this.#animations.runIntroAnimation()

        if (isHtmlElement(this.input, this.resultNode)) {
            this.input.addEventListener('input', this.#inputEventHandler);

            return true
        }

        return false;
    }

    /**
     * @returns {string}
     * @description it's return the digital root object if the argument input type will be string
     */
    getObject() {
        if (typeof this.input === 'string') {
            const validateNumber = this.#validateInput(this.input);
            const parseObject = this.#parseToObject(validateNumber);
            const display = new DisplayResults(parseObject);
            const markup = display.generateMarkup();

            return [parseObject, markup];
        }

        return null;
    }
}

export default DigitalRoot;