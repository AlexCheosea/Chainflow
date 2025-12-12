// Game Configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

// Global variables
let player;
let enemies;
let cursors;
let wasd;
let playerBullets;
let enemyBullets;
let walls;
let doors;
let roomNumber = 1;
let enemiesInRoom = 0;
let roomCleared = false;
let healthText;
let roomText;
let scoreText;
let score = 0;
let playerHealth = 100;
let lastFired = 0;
let fireRate = 150; // Faster fire rate for continuous shooting
let isMouseDown = false; // Track mouse button state
let mousePointer; // Store mouse position

function preload() {
    // Create placeholder graphics
    this.textures.generate('player', { data: ['4'], pixelWidth: 8 });
    this.textures.generate('enemy', { data: ['3'], pixelWidth: 8 });
    this.textures.generate('bullet', { data: ['1'], pixelWidth: 4 });
    this.textures.generate('wall', { data: ['0'], pixelWidth: 32 });
    this.textures.generate('door', { data: ['2'], pixelWidth: 32 });
}

function create() {
    // Create groups
    walls = this.physics.add.staticGroup();
    doors = this.physics.add.staticGroup();
    enemies = this.physics.add.group();
    playerBullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 30
    });
    enemyBullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 50
    });

    // Create player
    player = this.physics.add.sprite(400, 300, 'player');
    player.setScale(3);
    player.setTint(0x00ff00);
    player.setCollideWorldBounds(true);

    // Input
    cursors = this.input.keyboard.createCursorKeys();
    wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Mouse input for shooting
    this.input.on('pointerdown', (pointer) => {
        isMouseDown = true;
        mousePointer = pointer;
    });

    this.input.on('pointerup', () => {
        isMouseDown = false;
    });

    this.input.on('pointermove', (pointer) => {
        mousePointer = pointer;
    });

    // UI
    healthText = this.add.text(16, 16, 'Health: 100', {
        fontSize: '20px',
        fill: '#ff0000',
        fontStyle: 'bold'
    });

    roomText = this.add.text(16, 46, 'Room: 1', {
        fontSize: '20px',
        fill: '#ffff00',
        fontStyle: 'bold'
    });

    scoreText = this.add.text(16, 76, 'Score: 0', {
        fontSize: '20px',
        fill: '#00ff00',
        fontStyle: 'bold'
    });

    // Collisions
    this.physics.add.collider(player, walls);
    this.physics.add.collider(enemies, walls);
    this.physics.add.collider(player, doors, enterDoor, null, this);
    this.physics.add.overlap(playerBullets, enemies, hitEnemy, null, this);
    this.physics.add.overlap(playerBullets, walls, destroyBullet, null, this);
    this.physics.add.overlap(enemyBullets, player, hitPlayer, null, this);
    this.physics.add.overlap(enemyBullets, walls, destroyBullet, null, this);
    this.physics.add.overlap(player, enemies, touchEnemy, null, this);

    // Generate first room
    generateRoom(this);
}

function update(time) {
    if (playerHealth <= 0) {
        gameOver(this);
        return;
    }

    // Player movement
    player.setVelocity(0);

    const speed = 200;
    if (cursors.left.isDown || wasd.left.isDown) {
        player.setVelocityX(-speed);
    } else if (cursors.right.isDown || wasd.right.isDown) {
        player.setVelocityX(speed);
    }

    if (cursors.up.isDown || wasd.up.isDown) {
        player.setVelocityY(-speed);
    } else if (cursors.down.isDown || wasd.down.isDown) {
        player.setVelocityY(speed);
    }

    // Normalize diagonal movement
    if (player.body.velocity.x !== 0 && player.body.velocity.y !== 0) {
        player.body.velocity.normalize().scale(speed);
    }

    // Enemy AI and shooting
    enemies.children.entries.forEach(enemy => {
        if (enemy.active) {
            enemyAI(this, enemy, time);
        }
    });
    if (isMouseDown && mousePointer && time > lastFired + fireRate) {
        shootBullet(this, mousePointer);
        lastFired = time;
    }

    // Check if room is cleared
    if (enemiesInRoom > 0 && enemies.countActive() === 0 && !roomCleared) {
        roomCleared = true;
        openDoors();
    }

    // Update UI
    healthText.setText('Health: ' + playerHealth);
    roomText.setText('Room: ' + roomNumber);
    scoreText.setText('Score: ' + score);
}

function generateRoom(scene) {
    // Clear existing entities
    walls.clear(true, true);
    doors.clear(true, true);
    enemies.clear(true, true);
    playerBullets.clear(true, true);
    enemyBullets.clear(true, true);

    roomCleared = false;

    // Create walls (room boundaries)
    const wallThickness = 32;

    // Top wall
    for (let x = 0; x < 800; x += wallThickness) {
        let wall = walls.create(x, 0, 'wall');
        wall.setTint(0x666666);
        wall.refreshBody();
    }

    // Bottom wall
    for (let x = 0; x < 800; x += wallThickness) {
        let wall = walls.create(x, 600 - wallThickness, 'wall');
        wall.setTint(0x666666);
        wall.refreshBody();
    }

    // Left wall
    for (let y = wallThickness; y < 600 - wallThickness; y += wallThickness) {
        let wall = walls.create(0, y, 'wall');
        wall.setTint(0x666666);
        wall.refreshBody();
    }

    // Right wall
    for (let y = wallThickness; y < 600 - wallThickness; y += wallThickness) {
        let wall = walls.create(800 - wallThickness, y, 'wall');
        wall.setTint(0x666666);
        wall.refreshBody();
    }

    // Create doors (locked initially)
    let topDoor = doors.create(400, 10, 'door');
    topDoor.setTint(0xff0000);
    topDoor.setScale(2, 1);
    topDoor.locked = true;
    topDoor.refreshBody();

    // Reset player position
    player.setPosition(400, 300);

    // Spawn enemies
    enemiesInRoom = Math.min(3 + Math.floor(roomNumber / 2), 15);
    for (let i = 0; i < enemiesInRoom; i++) {
        spawnEnemy(scene);
    }
}

function spawnEnemy(scene) {
    let x = Phaser.Math.Between(100, 700);
    let y = Phaser.Math.Between(100, 500);

    // Make sure enemy doesn't spawn too close to player
    while (Phaser.Math.Distance.Between(x, y, player.x, player.y) < 150) {
        x = Phaser.Math.Between(100, 700);
        y = Phaser.Math.Between(100, 500);
    }

    let enemy = enemies.create(x, y, 'enemy');
    enemy.setScale(2.5);
    enemy.setTint(0xff0000);
    enemy.health = 30 + (roomNumber * 5);
    enemy.lastShot = 0;
    enemy.shootDelay = Phaser.Math.Between(1000, 2000);
}

function enemyAI(scene, enemy, time) {
    // Move towards player
    const speed = 80 + (roomNumber * 5);
    const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);

    if (distance > 200) {
        scene.physics.moveToObject(enemy, player, speed);
    } else if (distance < 150) {
        scene.physics.moveToObject(enemy, player, -speed * 0.5);
    } else {
        enemy.setVelocity(0);
    }

    // Shoot at player
    if (time > enemy.lastShot + enemy.shootDelay) {
        enemyShoot(scene, enemy);
        enemy.lastShot = time;
    }
}

function enemyShoot(scene, enemy) {
    let bullet = enemyBullets.get(enemy.x, enemy.y);
    if (bullet) {
        bullet.setActive(true);
        bullet.setVisible(true);
        bullet.setScale(1.5);
        bullet.setTint(0xff6600);

        scene.physics.moveToObject(bullet, player, 300);

        scene.time.delayedCall(3000, () => {
            if (bullet.active) bullet.destroy();
        });
    }
}

function shootBullet(scene, pointer) {
    if (scene.time.now > lastFired + fireRate) {
        let bullet = playerBullets.get(player.x, player.y);
        if (bullet) {
            bullet.setActive(true);
            bullet.setVisible(true);
            bullet.setScale(2);
            bullet.setTint(0x00ffff);

            let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
            scene.physics.velocityFromRotation(angle, 500, bullet.body.velocity);

            lastFired = scene.time.now;

            scene.time.delayedCall(2000, () => {
                if (bullet.active) bullet.destroy();
            });
        }
    }
}

function hitEnemy(bullet, enemy) {
    bullet.destroy();
    enemy.health -= 10;

    // Flash effect
    enemy.setTint(0xffffff);
    this.time.delayedCall(100, () => {
        if (enemy.active) enemy.setTint(0xff0000);
    });

    if (enemy.health <= 0) {
        enemy.destroy();
        score += 100;

        // Particle effect
        createParticles(this, enemy.x, enemy.y, 0xff0000);
    }
}

function hitPlayer(player, bullet) {
    bullet.destroy();
    playerHealth -= 10;

    // Flash effect
    player.setTint(0xff0000);
    this.time.delayedCall(100, () => {
        player.setTint(0x00ff00);
    });
}

function touchEnemy(player, enemy) {
    playerHealth -= 1;
}

function destroyBullet(bullet) {
    bullet.destroy();
}

function openDoors() {
    doors.children.entries.forEach(door => {
        door.setTint(0x00ff00);
        door.locked = false;
    });
}

function enterDoor(player, door) {
    if (!door.locked) {
        roomNumber++;
        score += 500;
        playerHealth = Math.min(100, playerHealth + 20); // Heal on room clear
        generateRoom(this);
    }
}

function createParticles(scene, x, y, color) {
    for (let i = 0; i < 8; i++) {
        let particle = scene.add.rectangle(x, y, 4, 4, color);
        let angle = (Math.PI * 2 * i) / 8;
        let speed = 100;

        scene.tweens.add({
            targets: particle,
            x: x + Math.cos(angle) * 50,
            y: y + Math.sin(angle) * 50,
            alpha: 0,
            duration: 500,
            onComplete: () => particle.destroy()
        });
    }
}

function gameOver(scene) {
    scene.physics.pause();

    let gameOverText = scene.add.text(400, 250, 'GAME OVER', {
        fontSize: '64px',
        fill: '#ff0000',
        fontStyle: 'bold'
    });
    gameOverText.setOrigin(0.5);

    let finalScore = scene.add.text(400, 320, 'Final Score: ' + score, {
        fontSize: '32px',
        fill: '#ffffff'
    });
    finalScore.setOrigin(0.5);

    let restartText = scene.add.text(400, 370, 'Click to Restart', {
        fontSize: '24px',
        fill: '#00ff00'
    });
    restartText.setOrigin(0.5);

    scene.input.once('pointerdown', () => {
        scene.scene.restart();
        playerHealth = 100;
        roomNumber = 1;
        score = 0;
    });
}

