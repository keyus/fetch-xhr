import store from '@store'
import { message } from 'antd'
import { logout } from '@action/user'

//退出code
const _logout_code = [401, 402];

//免错误通知code
const _not_error_code = [10, 1001,];

//错误信息提示队列
const _error_message_que = [];

class XHRFetch {
    baseURL = '/api/';
    method = undefined;
    url = null;
    constructor() {
        this._fetch.get = this.get;
        this._fetch.post = this.post;
        return this._fetch;
    }
    getDefaultHeaders() {
        return new Headers({
            'Content-Type': 'application/json;charset=UTF-8',
            'Authorization': localStorage.getItem('token'),
        });
    }
    _getUrl(url) {
        return `${this.baseURL}${url}`;
    }
    _fetch(url, body, option = {}) {
        this._send(url, body, option)
    }
    get(url, body, option) {
        this.method = 'get';
        this._send(url, body, option)
    }
    post(url, body, option = {}) {
        this.method = 'post';
        this._send(url, body, option)
    }
    _send(url, body, option = {}) {

        //cache current fetch response
        let currentResponse = null;
        let headers = this.getDefaultHeaders();

        const url = this._getUrl(url);

        // if body data is formdata type , delete default heades content-type , fetch auto set header's content-type
        const isFormdata = body instanceof FormData;

        if (isFormdata) {
            headers.delete('Content-Type');
        }
        else {
            body = JSON.stringify(body);
        }

        option = {
            ...option,
            method: this.method,
            headers: option.headers || headers,
            body,
        }

        return new Promise((resolve, reject) => {
            fetch(url, option)
                .then(response => {
                    currentResponse = response;
                    //http status 200
                    if (response.ok) {
                        const contentType = response.headers.get('content-type').toLocaleLowerCase();

                        //stream
                        if (['stream', 'excel', 'download', 'blob'].some(it => contentType.includes(it))) {
                            return response.blob()
                        }

                        return response.json();
                    }
                    //other status 500...400..403..,
                    else {
                        throw new Error(response.statusText);
                    }
                })
                .then(response => {
                    /**
                     * if response data is stream 
                     * return code and fetch headers and response data
                     */
                    if (response instanceof Blob) {
                        return resolve({
                            code: 200,
                            headers: currentResponse.headers,
                            data: response,
                        });
                    }

                    const {
                        code,
                        msg,
                    } = response;

                    /**
                     * you can custom the code
                     * API success code
                     */
                    if (code === 200) return resolve(response);

                    /**
                     * need logout code
                     */
                    if (_logout_code.includes(code)) {
                        // is your custom logout function....
                        store.dispatch(logout());
                    }

                    /**
                     * the global error notify
                     */
                    if (!_not_error_code.includes(code)) {

                        if (!_error_message_que.length) {
                            const i = message.error(msg, 3, () => {
                                _error_message_que.pop();
                            });
                            _error_message_que.push(i);
                        }
                    }
                    reject(response);
                })

                /**
                 * network error or others bug
                 */
                .catch(error => {
                    message.error(error.message || 'Network response was not ok.')
                    reject(error);
                })
        })
    }
}

