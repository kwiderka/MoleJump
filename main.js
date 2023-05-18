// System
let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");
let canvasWidthScaled = canvas.width;
let canvasHeightScaled = canvas.height;
let lastFrameTime;
let actualWidth = -1;
let actualHeight = -1;
let lives = 4;

// Player
let playerX = 0;
let playerY = 0;
let playerVel = 0;
let playerAngle = 0;
let gravity = -1400;
let bounceVelMin = 1000;
let bounceVel = bounceVelMin;
let bounceVelHitIncrease = 120;
let bounceVelMissDecrease = 120;
let flipAngleVel = 0;
let uprightFix = false;
let totalAngleDeltaThisBounce = 0;
let blinkDelay = 3.0;
let blinkTime = 0.5;
let fallOut = false;
let fallOutTime = 0.0;
let fallOutLeft = false;
let totalFlips = 0;
let flipsThisBounce = 0;
let flipsLandedThisBounce = 0;
let flipsBeforePeak = 0;
let flipsAfterPeak = 0;
let perfectJump = false;
let didAFlipStreak = 0;
let perfectStreak = 0;
let didLandOnHead = false;
let maxHeightThisBounce = 0;

// Trampoline
let trampShakeAmount = 0;
let trampShakeDecayPct = 0.9;
let trampShakeAngle = 0;
let trampShakeAngleSpeed = 4000.0;

// Camera
let camScale = 0.7;
let camDecayDelay = 0;
let camScaleBounce = 0.0;
let camScaleBounceDecayPct = 0.8;

// Input
let touch = false
let touchX = 0;
let touchY = 0;

// Menu
let mainMenu = false;
let mainMenuTouch = false;

// UI
let popups = [];

// Goals
let goals = [];
let goalIdx = parseInt(localStorage.getItem("moleflip.goalIdx")) || 0;
goals.push({text: "Zrób jeden obrót", func: DidAFlipThisBounce, param: 1});
goals.push({text: "Zrób 2 obroty pod rząd", func: FlipStreakCheck, param: 2});
goals.push({text: "Wyląduj perfekcyjnie", func: LandedPerfectly, param: 1});
goals.push({text: "Osiągnij wysokość 20 metrów", func: ReachedHeight, param: 20});
goals.push({text: "Zrób podwójny obrót", func: DidAFlipThisBounce, param: 2});
goals.push({text: "Zrób 3 oboroty pod rząd", func: FlipStreakCheck, param: 3});
goals.push({text: "Wyląduj na głowie", func: LandedOnHead, param: 1});
// goals.push({text: "Zrób potrójny obrót", func: DidAFlipThisBounce, param: 3});
// goals.push({text: "Wyląduj perfekcyjnie 2 razy pod rząd", func: PerfectStreakCheck, param: 2});
// goals.push({text: "Osiągnij wysokość 50 metrów", func: ReachedHeight, param: 5});
// goals.push({text: "Zrób 4 oborty pod rząd", func: FlipStreakCheck, param: 4});
// goals.push({text: "Zrób poczwórny obrót", func: DidAFlipThisBounce, param: 4});
// goals.push({text: "Zrób 5 obrotów pod rząd", func: FlipStreakCheck, param: 5});
// goals.push({text: "Wyląduj perfekcyjnie 3 razy pod rząd", func: PerfectStreakCheck, param: 3});
// goals.push({text: "Osiągnij wysokość 100 metrów", func: ReachedHeight, param: 10});
let goalCompleteTime = 0.0;

document.addEventListener("keydown", e => {
    if (e.code === "Space") {
        touch = true;
        SetTouchPos(e);
    }
});
document.addEventListener("keyup", e => {
    if (e.code === "Space") {
        touch = false;
        SetTouchPos(e);
    }
});
document.addEventListener("keydown", e =>
{
    if (e.altKey && e.code === "KeyR")
    {
        localStorage.setItem("moleflip.maxHeightFt", 0);
        localStorage.setItem("moleflip.maxTotalFlips", 0);
        localStorage.setItem("moleflip.goalIdx", 0);
        goalIdx = 0;
    }
});

function SetTouchPos(event)
{
    touchX = event.pageX - canvas.offsetLeft;
    touchY = event.pageY - canvas.offsetTop;
}

function Reset()
{
    playerX = 0;
    playerY = 0;
    bounceVel = bounceVelMin;
    playerVel = bounceVel;
    playerAngle = 0;
    flipAngleVel = 0;
    uprightFix = false;
    totalAngleDeltaThisBounce = 0;
    trampShakeAmount = 0;
    trampShakeAngle = 0;
    camScale = 0.7;
    camDecayDelay = 0;
    fallOut = false;
    totalFlips = 0;
    flipsThisBounce = 0;
    flipsLandedThisBounce = 0;
    goalCompleteTime = 0.0;
    flipsBeforePeak = 0;
    flipsAfterPeak = 0;
    perfectJump = false;
    didAFlipStreak = 0;
    perfectStreak = 0;
    didLandOnHead = false;
    maxHeightThisBounce = 0;


}

function GameLoop(curTime)
{
    let dt = Math.min((curTime - (lastFrameTime || curTime)) / 1000.0, 0.2);  // Cap to 200ms (5fps)
    lastFrameTime = curTime;

    //FitToScreen();

    UpdateUI(dt);
    UpdatePlayer(dt);
    UpdateCamera(dt);
    UpdateTrampoline(dt);

    // Clear background
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "rgba(0, 0, 0, 0)";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "destination-over";
    ctx.restore();

    // Set camera scale
    ctx.save();
    ctx.scale(camScale + camScaleBounce, camScale + camScaleBounce);
    canvasWidthScaled = canvas.width/(camScale + camScaleBounce);
    canvasHeightScaled = canvas.height/(camScale + camScaleBounce);
    ctx.translate((canvasWidthScaled - canvas.width)*0.5, (canvasHeightScaled - canvas.height));

    // Draw everything
    DrawTrampoline();
    DrawPlayer();
    DrawUI();

    ctx.restore();
    window.requestAnimationFrame(GameLoop);
}

function UpdatePlayer(dt)
{
    let playerTouch = touch && !mainMenuTouch;

    // Falling out?
    if (fallOut)
    {
        let fallOutPct = fallOutTime / 1.0;
            playerX = Math.cos(fallOutPct * Math.PI * 0.5) * 400.0 * (fallOutLeft ? -1.0 : 1.0) * bounceVel*0.001;
            playerY = Math.sin(fallOutPct * Math.PI) * 200.0 * bounceVel*0.001;
            playerAngle += 800.0 * dt * (fallOutLeft ? -1.0 : 1.0);

            fallOutTime -= dt;
            if (fallOutTime <= 0.0)
            {
                Reset();
            }
            
        return;   
    }

    // Flipping?
    if (playerTouch && playerY > 100)
    {
        uprightFix = false;
        flipAngleVel += (720.0 - flipAngleVel)*0.1;
    }
    // Not flipping
    else
    {
        if (uprightFix)
        {
            playerAngle *= 0.8;
            if (Math.abs(playerAngle) < 0.01)
            {
                uprightFix = false;
            }
        }
        
        flipAngleVel *= 0.7;
    }

    // Calculate flips
    let prevPlayerAngle = playerAngle;
    playerAngle += flipAngleVel * dt;
    totalAngleDeltaThisBounce += playerAngle - prevPlayerAngle;
    let prevFlipsThisBounce = flipsThisBounce;
    flipsThisBounce = Math.floor((totalAngleDeltaThisBounce + 90.0) / 360.0);
    if (flipsThisBounce > prevFlipsThisBounce)
    {
        AddPopup(canvas.width*0.5 + 100, canvas.height - 200, `x${flipsThisBounce}`, "#D37CFF");

        if (playerVel > 0.0)
        {
            flipsBeforePeak++;
        }
    }

    // Clamp angle to -180 -> 180
    if (playerAngle >= 180.0)
    {
        playerAngle -= 360.0;
    }
    else if (playerAngle < -180.0)
    {
        playerAngle += 360;
    }

    // Move player
    playerVel += gravity * dt;
    playerY += playerVel * dt;
    maxHeightThisBounce = Math.max(playerY, maxHeightThisBounce);

    // Hit trampoline?
    if (playerY <= 0.0)
    {
        // Start trampoline shake
        trampShakeAmount = 16.0;
        trampShakeAngle = 0;

        // Fall out?
        if (Math.abs(playerAngle) > 30.0)
        {
            fallOut = true;
            fallOutTime = 1.0;
            fallOutLeft = Math.random() < 0.5;

            AddPopup(canvas.width*0.5 + 100, canvas.height - 100, "Oj oj!", "#F42");

            if (Math.abs(playerAngle) > 145.0)
            {
                didLandOnHead = true;
            }
        }
        else
        {
            // Set bounce velocity
            let didAFlip = totalAngleDeltaThisBounce >= 270;
            perfectJump = Math.abs(playerAngle) < 6.5;
            if (didAFlip)
            {
                let flipMult = 1.0 + (flipsThisBounce / 5)*0.5;
                let bounceVelIncrease = perfectJump ? (bounceVelHitIncrease * 1.5) : bounceVelHitIncrease;
                bounceVel += bounceVelIncrease * flipMult;
            }
            else
            {
                bounceVel = Math.max(bounceVel - bounceVelMissDecrease, bounceVelMin);
            }

            if (didAFlip && perfectJump && !mainMenu)
            {
                camScaleBounce = 0.025;
            }

            if (didAFlip)
            {
                flipsLandedThisBounce = flipsThisBounce;
                totalFlips += flipsThisBounce;
                didAFlipStreak++;
                if (perfectJump)
                {
                    perfectStreak++;
                }

                if (perfectJump)
                {
                    AddPopup(canvas.width*0.5 + 100, canvas.height - 100, "Idealnie!", "#FF0");
                }
                else
                {
                    AddPopup(canvas.width*0.5 + 100, canvas.height - 100, "Git", "#0F4");
                }
            }
            else
            {
                didAFlipStreak = 0;
                perfectStreak = 0;
            }
        }

        CheckGoals();

        // Reset for new bounce
        playerY = 0.0;
        playerVel = bounceVel;
        uprightFix = true;
        totalAngleDeltaThisBounce = 0;
        flipsLandedThisBounce = 0;
        flipsThisBounce = 0;
        flipsBeforePeak = 0;
        flipsAfterPeak = 0;
        didLandOnHead = false;
        maxHeightThisBounce = 0;
    }

}

function UpdateCamera(dt)
{
    // Calculate desired scale
    let desiredCamScale = (280.0 / Math.max(playerY, 280.0)) * 2.5;
    if (desiredCamScale < camScale)
    {
        camDecayDelay = 3.0;
    }
    else
    {
        camDecayDelay -= dt;
    }    
    desiredCamScale = Math.min(camScale, desiredCamScale);
    if (desiredCamScale < 0.5)
    {
        desiredCamScale = Math.pow(desiredCamScale, 0.97);
    }

    // Lerp to it
    camScale += (desiredCamScale - camScale) * 0.2;

    // Lerp out after hold delay is over
    if (camDecayDelay <= 0.0)
    {
        camScale += (0.7 - camScale) * 0.001;
    }

    camScaleBounce *= camScaleBounceDecayPct;
}

function UpdateTrampoline(dt)
{
    // Update shake
    trampShakeAmount *= trampShakeDecayPct;
    trampShakeAngle += trampShakeAngleSpeed * dt;
}

function UpdateUI(dt)
{
    // Main menu touch logic
    if (touch)
    {
        if (!mainMenuTouch)
        {
            if (mainMenu)
            {
                mainMenuTouch = true;
            }
            mainMenu = false;
        }

        // Reset game?
        if (goalIdx === goals.length &&
            touchX > canvas.width * 0.5 &&
            touchY < 75.0)
        {
            localStorage.setItem("moleflip.goalIdx", 0);
            goalIdx = 0;
            Reset();
            mainMenu = true;
            mainMenuTouch = true;
        }
    }
    else
    {
        mainMenuTouch = false;
    }

    // Update popups
    popups.forEach((popup, index, object) =>
    {
        popup.time += dt;
        if (popup.time >= 0.5)
        {
            object.splice(index, 1);
        }
    });

    // Update goal transition logic
    if (goalCompleteTime > 0.0)
    {
        goalCompleteTime -= dt;
        if (goalCompleteTime <= 0.0)
        {
            goalIdx++;
            localStorage.setItem("moleflip.goalIdx", goalIdx);
        }
    }
}

function DrawText(text, x, y, angle, size, align, color)
{
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.font = `bold ${size}px Arial`;
    ctx.fillStyle = color;
    ctx.textAlign = align.toLowerCase();
    ctx.fillText(text, 0, 0);
    ctx.restore();
}

var trampolineImage = new Image();
var legImage = new Image();
trampolineImage.src = 'trampolina.png';
legImage.src = 'nozka.png';

function DrawTrampoline()
{
    ctx.save();
    ctx.translate(canvas.width * 0.5, canvas.height - 120);

    // Draw left pole
    ctx.drawImage(legImage, -250, -90, 80, 100);

    // Draw right pole
    ctx.drawImage(legImage, 170, -90, 80, 100);

    // Draw mesh
    ctx.translate(0, Math.sin(trampShakeAngle * Math.PI/180.0) * trampShakeAmount);
    ctx.drawImage(trampolineImage, -300, -130, 600, 100);

    ctx.restore();
}




var playerImage = new Image();
playerImage.src = 'pngwing.com.png';

function DrawPlayer()
{
    ctx.save();
    ctx.translate(canvas.width * 0.5 + playerX, (canvas.height - 170) - playerY);
    ctx.translate(0, -50); // przesunięcie w górę o 10 pikseli
    ctx.rotate(playerAngle * Math.PI/180.0);
    ctx.drawImage(playerImage, -50, -60, 100, 120);
    ctx.restore();
}


function DrawUI()
{
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (mainMenu)
    {
        let subtitleTxt = "Naciśnij spację aby rozpocząć grę!";
        DrawText(subtitleTxt, canvas.width*0.5, 180, 0, 50, "center", "#000");
        DrawText(subtitleTxt, canvas.width*0.5 - 4, 180, 0, 50, "center", "#FFF");

    }
    else
    {
        let heightFt = Math.floor(playerY / 40.0);
        let maxHeightFt = localStorage.getItem("moleflip.maxHeightFt");
        if (maxHeightFt === null || heightFt > maxHeightFt)
        {
            localStorage.setItem("moleflip.maxHeightFt", heightFt);
            maxHeightFt = heightFt;
        }

        let heightTxt = `Wysokość: ${heightFt} m (Max: ${maxHeightFt} m)`;
        let livesCounter = `Ilość żyć: ${lives}`;
        DrawText(heightTxt, 12, 27, 0.0, 20, "left", "#");
        //DrawText(livesCounter, 12, 100, 0.0, 20, "left", "#000");

        let maxTotalFlips = localStorage.getItem("moleflip.maxTotalFlips");
        if (maxTotalFlips === null || totalFlips > maxTotalFlips)
        {
            localStorage.setItem("moleflip.maxTotalFlips", totalFlips);
            maxTotalFlips = totalFlips;
        }

        let flipsTxt = `Salta: ${totalFlips} (Max: ${maxTotalFlips})`;
        DrawText(flipsTxt, 12, 50, 0.0, 20, "left", "#000");
        //DrawText(flipsTxt, 18, 60, 0.0, 25, "left", "#524129");

        let goalTextColor = "#000";
        if (goalCompleteTime > 0.0)
        {
            goalTextColor = (goalCompleteTime % 0.15 < 0.075) ? "#000" : "#00FF00";
        }

        if (goalIdx < goals.length)
        {
            DrawText(`Wyzwanie #${goalIdx + 1}:`, canvas.width - 12, 27, 0.0, 20, "right", goalTextColor);
            DrawText(goals[goalIdx].text, canvas.width - 12, 50, 0.0, 20, "right", goalTextColor);
        }
        else
        {
            // goalTextColor = (Date.now() % 800 < 400) ? "#000" : "#FF9600";

            // DrawText(`Gratulacje! Ukończyłeś wszystkie wyzwania!`, canvas.width - 12, 27, 0.0, 20, "right", goalTextColor);
            // DrawText("Wyzeruj wyniki (alt + r) i graj ponownie!", canvas.width - 12, 50, 0.0, 20, "right", goalTextColor);

            document.getElementById("maxheightft").textContent = maxHeightFt;
            document.getElementById("maxtotalflips").textContent = maxTotalFlips;

            // Wyświetl div z wynikami
            document.getElementById("result-screen").style.display = "block";
            document.getElementById("game").style.display = "none";
            Reset();
            localStorage.setItem("moleflip.maxHeightFt", 0);
            localStorage.setItem("moleflip.maxTotalFlips", 0);
            localStorage.setItem("moleflip.goalIdx", 0);
            goalIdx = 0;
            
        }
    }

    // Draw popups
    popups.forEach(popup =>
    {
        let popupPct = Math.min(popup.time / 0.1, 1.0);
        let offsetAnglePct = Math.min(popup.time / 0.4, 1.0);
        let xOffset = Math.sin(offsetAnglePct * Math.PI * 0.5) * 25.0;
        let yOffset = Math.sin(offsetAnglePct * Math.PI * 0.5) * 50.0;
        let startSize = popup.smallSize ? 20 : 30;
        let sizeMult = popup.smallSize ? 10 : 25;
        DrawText(popup.text, popup.x + xOffset, popup.y - yOffset, -5*Math.PI/180.0, startSize + Math.sin(popupPct * Math.PI * 0.75) * sizeMult, "center", "#000");
        DrawText(popup.text, (popup.x + xOffset) - 3, (popup.y - yOffset) - 3, -5*Math.PI/180.0, startSize + Math.sin(popupPct * Math.PI * 0.75) * sizeMult, "center", popup.color);
    });

    ctx.restore();
}

function AddPopup(x, y, text, color, smallSize)
{
    popups.push({x: x, y: y, text: text, color: color, time: 0.0, smallSize: smallSize || false });
}

function FitToScreen()
{
    let aspectRatio = canvas.width / canvas.height;
    let newWidth = window.innerWidth;
    let newHeight = window.innerWidth / aspectRatio;

    if (newHeight > window.innerHeight)
    {
        newHeight = window.innerHeight;
        newWidth = newHeight * aspectRatio;
    }

    if (newWidth !== actualWidth || newHeight !== actualHeight)
    {
        canvas.style.width = newWidth+"px";
        canvas.style.height = newHeight+"px";

        actualWidth = newWidth;
        actualHeight = newHeight;
    }

    window.scrollTo(0, 0);
}

function CheckGoals()
{
    if (goalIdx < goals.length && goals[goalIdx].func(goals[goalIdx]))
    {
        AddPopup(canvas.width - 100, 120, "Zrobione!", "#FF0", true);
        goalCompleteTime = 1.0;
        didAFlipStreak = 0;
        perfectStreak = 0;
    }
}

function DidAFlipThisBounce(goal)
{
    if (flipsLandedThisBounce >= goal.param)
    {
        return true;
    }

    return false;
}

function LandedPerfectly(goal)
{
    return perfectJump && flipsLandedThisBounce > 0;
}

function FlipStreakCheck(goal)
{
    return didAFlipStreak >= goal.param;
}

function PerfectStreakCheck(goal)
{
    return perfectStreak >= goal.param;
}

function LandedOnHead(goal)
{
    return didLandOnHead;
}

function ReachedHeight(goal)
{
    return Math.floor(maxHeightThisBounce / 40.0) >= goal.param;
}

Reset();
window.requestAnimationFrame(GameLoop);