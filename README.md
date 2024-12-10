# fastmile-5g-reboot

Incredibly basic script to reboot Nokia Fastmile 5G devices, which (at least on the Rogers network) requires periodic reboots to perform well. 

To use, install dependencies with `npm install sjcl crypto-js` then run `node reboot.js <hostname> <username> <password>`

If everything is correct, it will reboot the device. If not, it'll crash since there's no real error handling here.
