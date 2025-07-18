/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-empty-object-type */
'use strict';

// type NonNullableValues<T> = {
//     [K in keyof T]: T[K] extends undefined | null ? never : T[K]
// }[keyof T];
// type NonNullableKeys<T> = {
//     [K in keyof T]: T[K] extends undefined | null ? never : K
// }[keyof T];
//
// type NonUndefinedValues<T> = {
//     [K in keyof T]: Exclude<T[K], undefined>;
// }[keyof T];
type NonUndefinedValuesObject<T> = {
    [K in NonUndefinedKeys<T>]: Exclude<T[K], undefined>;
};
type NonUndefinedKeys<T> = {
    [K in keyof T]: T[K] extends undefined ? never : K
}[keyof T];

type Spread<T extends readonly any[]> = T extends [infer First, ...infer Rest]
    ? First extends (null | undefined)
        ? Spread<Rest> // Пропускаем null/undefined
        : First extends object
            ? Rest extends any[]
                ? Omit<Spread<Rest>, NonUndefinedKeys<First>> & NonUndefinedValuesObject<First>
                : never
            : Spread<Rest> // Если не объект, пропускаем
    : {}
;

/**
 * Копирует свойства одного объекта в другой.
 * В отличии от Object.assign НЕ перезатирает уже существующие свойства target и
 *  пропускает undefined значения из sources
 */
export function append<T extends object | null | undefined, U extends Array<object | null | undefined>>(
    target: T,
    ...sources: U
): T extends object ? T & Spread<U> : Spread<U> {
    const _target = target ? Object(target) : Object.create(null);

    for (let j = 0, len2 = sources.length; j < len2; j++) {
        const source = sources[j] as Record<string, unknown> | null | undefined;

        if (!source) {
            continue;
        }

        const keys = Object.keys(source);

        for (let i = 0, len = keys.length; i < len; i++) {
            const key = keys[i] as NonNullable<typeof keys[number]>; ;
            const sourceValue = source[key] as unknown;

            if (_target[key] === void 0 && sourceValue !== void 0) {
                _target[key] = sourceValue;
            }
        }

        const symbols = Object.getOwnPropertySymbols(source);

        for (let i = 0, len = symbols.length; i < len; i++) {
            const key = symbols[i] as NonNullable<typeof symbols[number]>;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore `TS7053: Element implicitly has an any type because expression of type symbol can't be used to index type {}`
            const sourceValue = source[key];

            if (_target[key] === void 0 && sourceValue !== void 0) {
                _target[key] = sourceValue;
            }
        }
    }

    return _target;
}

export function defineProperty(obj: object, name: string, value: any, attributes?: PropertyDescriptor & ThisType<any>) {
    if (typeof attributes?.get === 'function' || typeof attributes?.set === 'function') {
        return Object.defineProperty(obj, name, {
            enumerable: false,
            configurable: true,
            ...attributes,
        });
    }

    return Object.defineProperty(obj, name, {
        enumerable: false,
        configurable: true,
        writable: true,
        ...attributes,
        value: value,
    });
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function defineMethodProperty(obj: object, name: string, method: Function) {
    const result = defineProperty(obj, name, method);

    if (typeof method === 'function' && method.name !== name) {
        const descriptor = Object.getOwnPropertyDescriptor(method, 'name');

        if (descriptor?.configurable) {
            Object.defineProperty(method, 'name', { configurable: true, value: name });
        }
    }

    return result;
}

export function redefineProperty(obj: object, propertyName: string, propertyDescriptor: PropertyDescriptor) {
    let existedPropertyDescriptor: PropertyDescriptor | undefined;
    let currentObj = obj;

    while (currentObj) {
        existedPropertyDescriptor = Object.getOwnPropertyDescriptor(currentObj, propertyName);

        currentObj = Object.getPrototypeOf(currentObj);
    }

    if (!existedPropertyDescriptor) {
        Object.defineProperty(obj, propertyName, propertyDescriptor);
    }

    if (propertyDescriptor.value && existedPropertyDescriptor?.set) {
        const { value, ...otherPropertyDescriptor } = propertyDescriptor;

        Reflect.set(obj, propertyName, value);
        Object.defineProperty(obj, propertyName, {
            ...existedPropertyDescriptor,
            ...otherPropertyDescriptor,
        });
    }
    else {
        Object.defineProperty(obj, propertyName, {
            ...existedPropertyDescriptor,
            ...propertyDescriptor,
        });
    }
}

/**
 * @private
 * @example
 * checkIsPropertyEditable(#{ a: 1, b: 2 }, 'a') === false;
 *
 * var objWithWritableAndNonConfigurableProp = Object.defineProperty({}, 'test', { value: 123, writable: true });
 * checkIsPropertyEditable(objWithWritableAndNonConfigurableProp, 'test') === true;
 * checkIsPropertyEditable(objWithWritableAndNonConfigurableProp, 'test', { isForDefineProperty: true }) === false;
 *
 * var sealedObj = Object.seal(Object.defineProperty({}, 'test', { value: 123, writable: true }));
 * checkIsPropertyEditable(sealedObj, 'test') === true;
 * checkIsPropertyEditable(sealedObj, 'otherProp') === false;
 *
 * var objWithReadonly = Object.defineProperty({}, 'test', { get(){ return 123 } });
 * checkIsPropertyEditable(objWithReadonly, 'test') === false;
 *
 * var objWithGetSet = Object.defineProperty({ _test: 123 }, 'test', { get(){ return this._test }, set(test){ this._test = test } });
 * checkIsPropertyEditable(objWithGetSet, 'test') === true;
 */
export function checkIsPropertyEditable(obj: object, propertyName: string, options?: { isForDefineProperty?: boolean }): boolean {
    if (Object.isFrozen(obj)) {
        return false;
    }

    const propertyDescriptors = Object.getOwnPropertyDescriptor(obj, propertyName);

    if (!propertyDescriptors) {
        if (Object.isSealed(obj)) {
            // Can't add new property to sealed object
            return false;
        }

        // No descriptor + object is not frozen/sealed, so 100% we can add property
        return true;
    }

    // Can't use Object.defineProperty for props with configurable === false
    if (options?.isForDefineProperty && !propertyDescriptors.configurable) {
        return false;
    }

    if (propertyDescriptors.get) {
        return !!propertyDescriptors.set;
    }

    return !!propertyDescriptors.writable;
}
