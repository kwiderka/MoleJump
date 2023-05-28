//plotno canvas
let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");
let canvasWidthScaled = canvas.width;
let canvasHeightScaled = canvas.height;
let lastFrameTime;
let actualWidth = -1;
let actualHeight = -1;

//fizyka
let gravity = -1400;
let bouncePowerMin = 1000;
let bouncePower = bouncePowerMin;
let bouncePowerHitIncrease = 120;
let bouncePowerMissDecrease = 120;
let flipAnglePower = 0;
let uprightFix = false;
let totalAngleDeltaThisBounce = 0;
let blinkDelay = 3.0;
let blinkTime = 0.5;
let badLanding = false;
let badLandingTime = 0.0;
let badLandingLeft = false;
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

// gracz
let moleX = 0;
let moleY = 0;
let molePower = 0;
let moleAngle = 0;

// trampolina
let trampSpringAmount = 0;
let trampSpringDecayPct = 0.9;
let trampSpringAngle = 0;
let trampSpringAngleSpeed = 4000.0;

// kamera
let camScale = 0.7;
let camDecayDelay = 0;
let camScaleBounce = 0.0;
let camScaleBounceDecayPct = 0.8;

// touch
let touch = false
let touchX = 0;
let touchY = 0;

// komunikaty
let msgs = [];

// wyzwania
let challanges = [];
let challangeIdx = parseInt(localStorage.getItem("molejump.challangeIdx")) || 0;
challanges.push({text: "Zrób jeden obrót", func: DidAFlipThisBounce, param: 1});
challanges.push({text: "Zrób 2 obroty pod rząd", func: FlipStreakCheck, param: 2});
challanges.push({text: "Wyląduj perfekcyjnie", func: LandedPerfectly, param: 1});
challanges.push({text: "Osiągnij wysokość 20 metrów", func: ReachedHeight, param: 20});
challanges.push({text: "Zrób podwójny obrót", func: DidAFlipThisBounce, param: 2});
challanges.push({text: "Zrób 3 oboroty pod rząd", func: FlipStreakCheck, param: 3});
challanges.push({text: "Wyląduj na głowie", func: LandedOnHead, param: 1});
let challangeCompleteTime = 0.0;

// klawisze

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

//reset wyników pod alt+r

document.addEventListener("keydown", e =>
{
    if (e.altKey && e.code === "KeyR")
    {
        localStorage.setItem("molejump.maxHeightFt", 0);
        localStorage.setItem("molejump.maxTotalFlips", 0);
        localStorage.setItem("molejump.challangeIdx", 0);
        challangeIdx = 0;
    }
});

function SetTouchPos(event)
{
    touchX = event.pageX - canvas.offsetLeft;
    touchY = event.pageY - canvas.offsetTop;
}

//reset wtnikow

function Reset()
{
    moleX = 0;
    moleY = 0;
    bouncePower = bouncePowerMin;
    molePower = bouncePower;
    moleAngle = 0;
    flipAnglePower = 0;
    uprightFix = false;
    totalAngleDeltaThisBounce = 0;
    trampSpringAmount = 0;
    trampSpringAngle = 0;
    camScale = 0.7;
    camDecayDelay = 0;
    badLanding = false;
    totalFlips = 0;
    flipsThisBounce = 0;
    flipsLandedThisBounce = 0;
    challangeCompleteTime = 0.0;
    flipsBeforePeak = 0;
    flipsAfterPeak = 0;
    perfectJump = false;
    didAFlipStreak = 0;
    perfectStreak = 0;
    didLandOnHead = false;
    maxHeightThisBounce = 0;
}

//pętla gra

function GameMole(curTime)
{
    let dt = Math.min((curTime - (lastFrameTime || curTime)) / 1000.0, 0.2);  // skapowane do 5fps
    lastFrameTime = curTime;

    // dopsaowanie do ekranu

    UpdateUI(dt);
    Updatemole(dt);
    UpdateCamera(dt);
    UpdateTrampoline(dt);

    // czyszczenie tła
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "rgba(0, 0, 0, 0)";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "destination-over";
    ctx.restore();

    // skalkowanie kamery
    ctx.save();
    ctx.scale(camScale + camScaleBounce, camScale + camScaleBounce);
    canvasWidthScaled = canvas.width/(camScale + camScaleBounce);
    canvasHeightScaled = canvas.height/(camScale + camScaleBounce);
    ctx.translate((canvasWidthScaled - canvas.width)*0.5, (canvasHeightScaled - canvas.height));

    // narysowanie elementów
    DrawTrampoline();
    Drawmole();
    DrawUI();

    ctx.restore();
    window.requestAnimationFrame(GameMole);
}

function Updatemole(dt)
{
    let moleTouch = touch;

    // wypadniecie
    if (badLanding)
    {
        let badLandingPct = badLandingTime / 1.0;
            moleX = Math.cos(badLandingPct * Math.PI * 0.5) * 400.0 * (badLandingLeft ? -1.0 : 1.0) * bouncePower*0.001;
            moleY = Math.sin(badLandingPct * Math.PI) * 200.0 * bouncePower*0.001;
            moleAngle += 800.0 * dt * (badLandingLeft ? -1.0 : 1.0);

            badLandingTime -= dt;
            if (badLandingTime <= 0.0)
            {
                Reset();
            }
            
        return;   
    }

    // rotacja
    if (moleTouch && moleY > 100)
    {
        uprightFix = false;
        flipAnglePower += (720.0 - flipAnglePower)*0.1;
    }
    // brak rotacji
    else
    {
        if (uprightFix)
        {
            moleAngle *= 0.8;
            if (Math.abs(moleAngle) < 0.01)
            {
                uprightFix = false;
            }
        }
        
        flipAnglePower *= 0.7;
    }

    // przeliczanie salt
    let prevmoleAngle = moleAngle;
    moleAngle += flipAnglePower * dt;
    totalAngleDeltaThisBounce += moleAngle - prevmoleAngle;
    let prevFlipsThisBounce = flipsThisBounce;
    flipsThisBounce = Math.floor((totalAngleDeltaThisBounce + 90.0) / 360.0);
    if (flipsThisBounce > prevFlipsThisBounce)
    {
        Addmsg(canvas.width*0.5 + 100, canvas.height - 200, `x${flipsThisBounce}`, "#D37CFF");

        if (molePower > 0.0)
        {
            flipsBeforePeak++;
        }
    }

    // kąty
    if (moleAngle >= 180.0)
    {
        moleAngle -= 360.0;
    }
    else if (moleAngle < -180.0)
    {
        moleAngle += 360;
    }

    // ruszanie kreta
    molePower += gravity * dt;
    moleY += molePower * dt;
    maxHeightThisBounce = Math.max(moleY, maxHeightThisBounce);

    // odbijanie od trampoliny
    if (moleY <= 0.0)
    {
        // ugięcie trampoliny
        trampSpringAmount = 16.0;
        trampSpringAngle = 0;

        // wypadniecie
        if (Math.abs(moleAngle) > 30.0)
        {
            badLanding = true;
            badLandingTime = 1.0;
            badLandingLeft = Math.random() < 0.5;

            Addmsg(canvas.width*0.5 + 100, canvas.height - 100, "Oj oj!", "#F42");

            if (Math.abs(moleAngle) > 145.0)
            {
                didLandOnHead = true;
            }
        }
        else
        {
            // prędkość odbicia
            let didAFlip = totalAngleDeltaThisBounce >= 270;
            perfectJump = Math.abs(moleAngle) < 6.5;
            if (didAFlip)
            {
                let flipMult = 1.0 + (flipsThisBounce / 5)*0.5;
                let bouncePowerIncrease = perfectJump ? (bouncePowerHitIncrease * 1.5) : bouncePowerHitIncrease;
                bouncePower += bouncePowerIncrease * flipMult;
            }
            else
            {
                bouncePower = Math.max(bouncePower - bouncePowerMissDecrease, bouncePowerMin);
            }

            if (didAFlip && perfectJump)
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
                    Addmsg(canvas.width*0.5 + 100, canvas.height - 100, "Idealnie!", "#FF0");
                }
                else
                {
                    Addmsg(canvas.width*0.5 + 100, canvas.height - 100, "Git", "#0F4");
                }
            }
            else
            {
                didAFlipStreak = 0;
                perfectStreak = 0;
            }
        }

        Checkchallanges();

        // reset przy wypadnieciu
        moleY = 0.0;
        molePower = bouncePower;
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
    // obliczanie skalowania
    let desiredCamScale = (280.0 / Math.max(moleY, 280.0)) * 2.5;
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

    // dopasowanie
    camScale += (desiredCamScale - camScale) * 0.2;

    // dopasowanie po delayu
    if (camDecayDelay <= 0.0)
    {
        camScale += (0.7 - camScale) * 0.001;
    }

    camScaleBounce *= camScaleBounceDecayPct;
}

function UpdateTrampoline(dt)
{
    // sprężynowanie trampoliny
    trampSpringAmount *= trampSpringDecayPct;
    trampSpringAngle += trampSpringAngleSpeed * dt;
}

function UpdateUI(dt)
{
    // zmiana komunikatów
    msgs.forEach((msg, index, object) =>
    {
        msg.time += dt;
        if (msg.time >= 0.5)
        {
            object.splice(index, 1);
        }
    });

    // Zmiana wyzwań
    if (challangeCompleteTime > 0.0)
    {
        challangeCompleteTime -= dt;
        if (challangeCompleteTime <= 0.0)
        {
            challangeIdx++;
            localStorage.setItem("molejump.challangeIdx", challangeIdx);
        }
    }
}

function AddText(text, x, y, angle, size, align, color)
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
trampolineImage.src = 'pliki/trampoline_mesh.png';
legImage.src = 'pliki/leg.png';

function DrawTrampoline()
{
    ctx.save();
    ctx.translate(canvas.width * 0.5, canvas.height - 120);

    // lewa nóżka
    ctx.drawImage(legImage, -250, -90, 80, 100);

    // prawa nóżka
    ctx.drawImage(legImage, 170, -90, 80, 100);

    // trampolina góra
    ctx.translate(0, Math.sin(trampSpringAngle * Math.PI/180.0) * trampSpringAmount);
    ctx.drawImage(trampolineImage, -300, -130, 600, 100);

    ctx.restore();
}

// grafika krecika
var moleImage = new Image();
moleImage.src = 'pliki/mole.png';

function Drawmole()
{
    ctx.save();
    ctx.translate(canvas.width * 0.5 + moleX, (canvas.height - 170) - moleY);
    ctx.translate(0, -50); // przesunięcie w górę o 10 pikseli
    ctx.rotate(moleAngle * Math.PI/180.0);
    ctx.drawImage(moleImage, -50, -60, 100, 120);
    ctx.restore();
}


function DrawUI()
{
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    let heightFt = Math.floor(moleY / 40.0);
    let maxHeightFt = localStorage.getItem("molejump.maxHeightFt");
    if (maxHeightFt === null || heightFt > maxHeightFt)
    {
        localStorage.setItem("molejump.maxHeightFt", heightFt);
            maxHeightFt = heightFt;
    }

    let heightTxt = `Wysokość: ${heightFt} m (Max: ${maxHeightFt} m)`;
    AddText(heightTxt, 12, 27, 0.0, 20, "left", "#");

    let maxTotalFlips = localStorage.getItem("molejump.maxTotalFlips");
    if (maxTotalFlips === null || totalFlips > maxTotalFlips)
    {
        localStorage.setItem("molejump.maxTotalFlips", totalFlips);
        maxTotalFlips = totalFlips;
    }

    let flipsTxt = `Salta: ${totalFlips} (Max: ${maxTotalFlips})`;
    AddText(flipsTxt, 12, 50, 0.0, 20, "left", "#000");

    let challangeTextColor = "#000";
    if (challangeCompleteTime > 0.0)
    {
        challangeTextColor = (challangeCompleteTime % 0.15 < 0.075) ? "#000" : "#00FF00";
    }

    if (challangeIdx < challanges.length)
    {
        AddText(`Wyzwanie #${challangeIdx + 1}:`, canvas.width - 12, 27, 0.0, 20, "right", challangeTextColor);
        AddText(challanges[challangeIdx].text, canvas.width - 12, 50, 0.0, 20, "right", challangeTextColor);
    }
    else
    {
        document.getElementById("maxheightft").textContent = maxHeightFt;
        document.getElementById("maxtotalflips").textContent = maxTotalFlips;

        // Wyświetl div z wynikami
        document.getElementById("result-screen").style.display = "block";
        document.getElementById("game").style.display = "none";
        Reset();
        localStorage.setItem("molejump.maxHeightFt", 0);
        localStorage.setItem("molejump.maxTotalFlips", 0);
        localStorage.setItem("molejump.challangeIdx", 0);
        challangeIdx = 0;
    }

    // Draw msgs
    msgs.forEach(msg =>
    {
        let msgPct = Math.min(msg.time / 0.1, 1.0);
        let offsetAnglePct = Math.min(msg.time / 0.4, 1.0);
        let xOffset = Math.sin(offsetAnglePct * Math.PI * 0.5) * 25.0;
        let yOffset = Math.sin(offsetAnglePct * Math.PI * 0.5) * 50.0;
        let startSize = msg.smallSize ? 20 : 30;
        let sizeMult = msg.smallSize ? 10 : 25;
        AddText(msg.text, msg.x + xOffset, msg.y - yOffset, -5*Math.PI/180.0, startSize + Math.sin(msgPct * Math.PI * 0.75) * sizeMult, "center", "#000");
        AddText(msg.text, (msg.x + xOffset) - 3, (msg.y - yOffset) - 3, -5*Math.PI/180.0, startSize + Math.sin(msgPct * Math.PI * 0.75) * sizeMult, "center", msg.color);
    });

    ctx.restore();
}

function Addmsg(x, y, text, color, smallSize)
{
    msgs.push({x: x, y: y, text: text, color: color, time: 0.0, smallSize: smallSize || false });
}

function WindowFit()
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

function Checkchallanges()
{
    if (challangeIdx < challanges.length && challanges[challangeIdx].func(challanges[challangeIdx]))
    {
        Addmsg(canvas.width - 100, 120, "Zrobione!", "#FF0", true);
        challangeCompleteTime = 1.0;
        didAFlipStreak = 0;
        perfectStreak = 0;
    }
}

function DidAFlipThisBounce(challange)
{
    if (flipsLandedThisBounce >= challange.param)
    {
        return true;
    }

    return false;
}

function LandedPerfectly(challange)
{
    return perfectJump && flipsLandedThisBounce > 0;
}

function FlipStreakCheck(challange)
{
    return didAFlipStreak >= challange.param;
}

function PerfectStreakCheck(challange)
{
    return perfectStreak >= challange.param;
}

function LandedOnHead(challange)
{
    return didLandOnHead;
}

function ReachedHeight(challange)
{
    return Math.floor(maxHeightThisBounce / 40.0) >= challange.param;
}

Reset();
window.requestAnimationFrame(GameMole);