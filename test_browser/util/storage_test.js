'use strict';


var assert = require('assert');


describe('DOMStorage', function() {
    var DOMStorage = milo.util.storage;
    var domStorage;

    function getLocalStorage() {
        var length = localStorage.length
            , keys = [];

        for (var i = 0; i < length; i++)
            keys.push(localStorage.key(i));

        var data = _.mapToObject(keys, function(key) {
            return localStorage.getItem(key);
        });

        return data;
    }


    function setLocalStorage(data) {
        _.eachKey(data, function(value, key) {
            localStorage.setItem(key, value);
        });
    }


    beforeEach(function() {
        window.localStorage.clear();
        domStorage = new DOMStorage('MiloTest');
    });


    describe('setItem and getItem instance methods', function() {
        it('should store and get strings', function() {
            domStorage.setItem('name', 'milo');
            assert.deepEqual(getLocalStorage(), {
                'MiloTest/name': 'milo', 
                'MiloTest/name:___milo_data_type': 'string'
            })
            var itemValue = domStorage.getItem('name');
            assert(itemValue === 'milo');
        });


        it('should store and get numbers', function() {
            domStorage.setItem('year', 2014);
            assert.deepEqual(getLocalStorage(), {
                'MiloTest/year': '2014', 
                'MiloTest/year:___milo_data_type': 'number'
            })
            var itemValue = domStorage.getItem('year');
            assert(itemValue === 2014);
        });


        it('should store and get booleans', function() {
            domStorage.setItem('trueValue', true);
            domStorage.setItem('falseValue', false);
            assert.deepEqual(getLocalStorage(), {
                'MiloTest/trueValue': 'true', 
                'MiloTest/trueValue:___milo_data_type': 'boolean',
                'MiloTest/falseValue': 'false', 
                'MiloTest/falseValue:___milo_data_type': 'boolean',
            })
            var itemValue = domStorage.getItem('trueValue');
            assert(itemValue === true);
            var itemValue = domStorage.getItem('falseValue');
            assert(itemValue === false);
        });


        it('should store and get Date', function() {
            var now = new Date;
            domStorage.setItem('time', now);
            assert.deepEqual(getLocalStorage(), {
                'MiloTest/time': now.toString(), 
                'MiloTest/time:___milo_data_type': 'Date'
            })
            var itemValue = domStorage.getItem('time');
            assert(itemValue - now < 1000);
            assert.equal(itemValue.toString(), now.toString());
            assert(itemValue instanceof Date);
        });


        it('should store and get Objects', function() {
            domStorage.setItem('info', { name: 'milo', test: 1, list: ['item1', 2] });
            assert.deepEqual(getLocalStorage(), {
                'MiloTest/info': '{"name":"milo","test":1,"list":["item1",2]}', 
                'MiloTest/info:___milo_data_type': 'Object'
            })
            var itemValue = domStorage.getItem('info');
            assert.deepEqual(itemValue, { name: 'milo', test: 1, list: ['item1', 2] });
            assert(itemValue instanceof Object);
        });


        it('should store and get Arrays', function() {
            domStorage.setItem('list', [ 'item1', 2, { item: 3 } ]);
            assert.deepEqual(getLocalStorage(), {
                'MiloTest/list': '["item1",2,{"item":3}]', 
                'MiloTest/list:___milo_data_type': 'Array'
            })
            var itemValue = domStorage.getItem('list');
            assert.deepEqual(itemValue, [ 'item1', 2, { item: 3 } ]);
            assert(Array.isArray(itemValue));
        });


        it('should store and get functions', function() {
            function myFunc() { return 1234; }
            domStorage.setItem('myFunc', myFunc);
            assert.deepEqual(getLocalStorage(), {
                'MiloTest/myFunc': 'function myFunc() { return 1234; }', 
                'MiloTest/myFunc:___milo_data_type': 'function'
            })
            var itemValue = domStorage.getItem('myFunc');
            assert.equal(itemValue.toString(), myFunc.toString());
            assert.equal(typeof itemValue, 'function');
            assert.equal(itemValue(), 1234);
        });


        it('should store and get RegExp', function() {
            domStorage.setItem('pattern', /ab+c/i);
            assert.deepEqual(getLocalStorage(), {
                'MiloTest/pattern': '/ab+c/i', 
                'MiloTest/pattern:___milo_data_type': 'RegExp'
            })
            var itemValue = domStorage.getItem('pattern');
            assert.equal(itemValue.toString(), /ab+c/i.toString());
            assert(itemValue instanceof RegExp);
            assert(itemValue.test('ABBC'));
        });


        it('should store and get Models and ModelPaths (with registration)', function() {
            var Model = milo.Model;
            Model.registerWithDOMStorage();
            var m = new Model({ info: { name: 'milo' } });
            domStorage.setItem('myModel', m);
            domStorage.setItem('mPath', m('.info'));

            assert.deepEqual(getLocalStorage(), {
                'MiloTest/myModel': '{"info":{"name":"milo"}}', 
                'MiloTest/myModel:___milo_data_type': 'Model',
                'MiloTest/mPath': '{"name":"milo"}', 
                'MiloTest/mPath:___milo_data_type': 'Model'
            })
            var itemValue = domStorage.getItem('myModel');
            assert.deepEqual(m.get(), { info: { name: 'milo' } });
            assert(itemValue instanceof Model);
            var itemValue = domStorage.getItem('mPath');
            assert.deepEqual(m('.info').get(), { name: 'milo' });
            assert(itemValue instanceof Model);
        });


        it('should store and get Component (sub)class instances', function() {
            var Component = milo.Component;
            var comp = Component.createOnElement(undefined, '<span>Test</span>');
            assert(/<div ml-bind="Component:[A-Za-z0-9_]+"><span>Test<\/span><\/div>/.test(comp.el.outerHTML));

            domStorage.setItem('comp', comp);
            assert.equal(localStorage.length, 2);
            var itemValue = domStorage.getItem('comp');
            assert.equal(comp.name, itemValue.name);
            assert.equal(comp.el.outerHTML, itemValue.el.outerHTML);
            assert(itemValue instanceof Component);
        });
    });


    describe('registerDataType class method', function() {
        it('should facilitate storing and getting of custom classes', function() {
            function MyClass(data) {
                this._data = data;
            }

            function myClassSerializer(value) {
                return JSON.stringify(value._data);
            }

            function myClassParser(valueStr) {
                var value = milo.util.jsonParse(valueStr);
                return new MyClass(value);
            }

            DOMStorage.registerDataType('MyClass', myClassSerializer, myClassParser);

            var myClass = new MyClass({ name: 'milo' });
            domStorage.setItem('myClass', myClass);
            assert.deepEqual(getLocalStorage(), {
                'MiloTest/myClass': '{"name":"milo"}', 
                'MiloTest/myClass:___milo_data_type': 'MyClass'
            })
            var itemValue = domStorage.getItem('myClass');
            assert.deepEqual(itemValue._data, { name: 'milo' });
            assert(itemValue instanceof MyClass);
        });
    });


    describe('removeItem method', function() {
        it('should remove items', function() {
            assert.equal(localStorage.length, 0);           
            domStorage.setItem('name', 'milo');
            assert.equal(localStorage.length, 2);
            domStorage.removeItem('name');
            assert.equal(localStorage.length, 0);
        });
    });


    describe('set and get instance methods', function() {
        var itemsToStore = {
            name: 'milo',
            test: 1,
            list: [ 'item1', 2 ],
            info: { test: 3 }
        };

        var expectedLocalStorage = {
            'MiloTest/name': 'milo', 
            'MiloTest/name:___milo_data_type': 'string',
            'MiloTest/test': '1', 
            'MiloTest/test:___milo_data_type': 'number',
            'MiloTest/list': '["item1",2]', 
            'MiloTest/list:___milo_data_type': 'Array',
            'MiloTest/info': '{"test":3}', 
            'MiloTest/info:___milo_data_type': 'Object',
        }


        function testStoredValues() {
            assert.deepEqual(getLocalStorage(), expectedLocalStorage)
            var itemValues = domStorage.get(['name', 'test', 'list', 'info']);
            assert.deepEqual(itemValues, itemsToStore);
            var itemValues = domStorage.get('name', 'test', 'list', 'info');
            assert.deepEqual(itemValues, itemsToStore);
        }


        it('should store data passed as object to multiple keys', function() {
            domStorage.set(itemsToStore);
            testStoredValues();
        });


        it('should store data passed as list of keys and values in arguments', function() {
            domStorage.set(
                'name', 'milo',
                'test', 1,
                'list', [ 'item1', 2 ],
                'info', { test: 3 }
            );
            testStoredValues();
        });
    });


    describe('remove instance method', function() {
        var itemsToStore = {
            name: 'milo',
            test: 1,
            list: [ 'item1', 2 ],
            info: { test: 3 }
        };

        beforeEach(function() {
            assert.equal(localStorage.length, 0);           
            domStorage.set(itemsToStore);
            assert.equal(localStorage.length, 8);
        });

        it('should remove multiple keys when passed as array', function() {
            domStorage.remove(['name', 'test', 'list', 'info']);
            assert.equal(localStorage.length, 0);           
        });

        it('should remove multiple keys when passed as list', function() {
            domStorage.remove('name', 'test', 'list', 'info');
            assert.equal(localStorage.length, 0);           
        });

        it('should remove multiple keys when passed as list/arrays combination', function() {
            domStorage.remove('name', ['test', ['list', 'info']]);
            assert.equal(localStorage.length, 0);           
        });
    });


    describe('getAllKeys and getAllItems instance methods', function() {
        var itemsToStore = {
            name: 'milo',
            test: 1,
            list: [ 'item1', 2 ],
            info: { test: 3 }
        };

        beforeEach(function() {
            assert.equal(localStorage.length, 0);           
            domStorage.set(itemsToStore);
            assert.equal(localStorage.length, 8);
        });

        it('getAllKeys should return the list of stored keys', function() {
            var keys = domStorage.getAllKeys();
            assert.deepEqual(_.object(keys, true), {
                name: true,
                test: true,
                list: true,
                info: true
            })
        });

        it('getAllItems should return all stored values', function() {
            var items = domStorage.getAllItems();
            assert.deepEqual(items, {
                name: 'milo',
                test: 1,
                list: [ 'item1', 2 ],
                info: { test: 3 }
            })
        });
    });
});
