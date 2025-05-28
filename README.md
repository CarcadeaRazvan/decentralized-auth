# decentralized-auth

1. user se conecteaza la chain cu wallet eth
2. userul face un request de login catre server
3. serverul genereaza un nonce si il trimite inapoi userului
4. userul genereaza perechea diffie hellman, semneaza nonce ul
        cu cheia privata eth, le stocheaza on chain
        map: user -> nonces[] si trimite catre server
        cheia publica diffie hellman
5. serverul primeste cheia publica diffie hellman si verifica
        ultimul nonce introdus de user pe chain, daca semnatura
        decryptata cu cheia publica eth este aceeasi cu nonce ul generat initial, atunci autentificarea a avut loc cu success si clientul este legitim.

AUTENTIFICARE REALIZATA CU SUCCESS

6. serverul genereaza perechea temporara diffie hellman, apoi
        genereaza S (shared secret) folosindu se de cheia publica a userului, genereaza un jwt cu o valabilitate de 1 ora, apoi
        il encrypteaza cu S si il trimite clientului impreuna cu cheia
        sa publica DH
7. clientul primeste cheia publica a serverului, genereaza S prin
        aceeasi metoda, apoi decrypteaza JWT folosind S, iar apoi
        toate requesturile vor fi criptate / decriptate folosind acest S.

AUTORIZARE REALIZATA CU SUCCESS

# TODO
- de creat functionalitati cu rute private ce vor fi accesibile doar
        atunci cand utilizatorii sunt in posesia unui jwt valid
- de testat ca datele utilizatorilor sunt unice pentru fiecare
        in parte si ca nu se altereaza datele
- de creat un scenariu in care sa pun un MITM pe fiecare 
        dintre firele de comunicatie in care sa arat ca toate datele sunt criptate si ca nicio informatie nu este relevanta fara eth private key sau shared secret S
- de imbunatatit UI
- de containerizat solutia sa porneasca tot setupul dintr un docker
        compose                        