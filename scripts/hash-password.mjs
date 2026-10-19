import {scryptSync,randomBytes} from 'node:crypto';
import {stdin,stdout} from 'node:process';
import {createInterface} from 'node:readline/promises';
const cli=createInterface({input:stdin,output:stdout});
const password=await cli.question('Nueva contraseña del administrador (mínimo 16 caracteres): ');cli.close();
if(password.length<16)throw Error('Contraseña demasiado corta');
const salt=randomBytes(16);const hash=scryptSync(password,salt,64);
console.log(`ADMIN_PASSWORD_HASH=scrypt$${salt.toString('hex')}$${hash.toString('hex')}`);
