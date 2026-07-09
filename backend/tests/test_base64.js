const base64Str = "CBMiygFBVV95cUxQTlRUM3BaeG51UDdwbW5ySVJQZ0hoUERwLU92UWlZbUxuYTIwM0tZUkNVRFpacXp5cTVWMHNIbW91UUVzeUlFcm1MOEE1SUU2aE40OVltUFVvWUlucEZvb05lbzVsdlVwRHBOUHZqQW92WUZKS082WHNWeTB3bnBZQnVuWTliTjNQRWtnaUU3M0J1ejd5YjVUcENrTE9vdkNJZE1aV1hUQ2syUHNHY0hRcFVvdnBzQ3JYZmptN0NIZHA5c0FkR3FtZTNn";

const buffer = Buffer.from(base64Str, 'base64');
const decoded = buffer.toString('utf-8');
console.log("Decoded utf-8:", decoded);

// Try replacing non-printable characters with spaces to see the URL
console.log("Cleaned:", decoded.replace(/[^ -~]+/g, ' '));
