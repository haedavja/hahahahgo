#!/bin/bash

# Fix stunProcessing.test.ts by adding as any to action and queue
sed -i 's/const createQueue = () => \[/const createQueue = () => [/g' /home/user/hahahahgo/src/components/battle/utils/stunProcessing.test.ts
sed -i 's/const action = {/const action = {/g; s/};$/} as any;/g' /home/user/hahahahgo/src/components/battle/utils/stunProcessing.test.ts
sed -i 's/processStunEffect({$/processStunEffect({/g; s/queue: createQueue(),$/queue: createQueue() as any,/g; s/queue: queue,$/queue: queue as any,/g; s/queue,$/queue as any,/g' /home/user/hahahahgo/src/components/battle/utils/stunProcessing.test.ts

# Fix preAttackSpecials.test.ts hasSpecial tests
sed -i '23s/const card = {/const card = {/; 23s/};$/} as any;/' /home/user/hahahahgo/src/components/battle/utils/preAttackSpecials.test.ts
sed -i '29s/const card = {/const card = {/; 29s/};$/} as any;/; 30s/expect/expect/' /home/user/hahahahgo/src/components/battle/utils/preAttackSpecials.test.ts
sed -i '35s/const card = {/const card = {/; 35s/};$/} as any;/; 36s/expect/expect/; 37s/expect/expect/' /home/user/hahahahgo/src/components/battle/utils/preAttackSpecials.test.ts
