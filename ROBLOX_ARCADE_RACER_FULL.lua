-- ROBLOX_ARCADE_RACER_FULL.lua
-- Place this Script in ServerScriptService.
-- Expected workspace layout:
-- Workspace.Track.Waypoints (Folder with Parts named 1,2,3...)
-- Workspace.Track.Pickups (Folder with Parts)
-- Workspace.Karts (Folder with kart Models)
-- Each kart Model needs: PrimaryPart + VehicleSeat (or Seat)
-- Optional kart attributes:
--   IsAI (bool), DriverUserId (number), RacerName (string)

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")
local Debris = game:GetService("Debris")

local CONFIG = {
    totalLaps = 3,

    move = {
        maxSpeed = 95,
        boostMaxSpeed = 132,
        reverseSpeed = -28,
        accel = 70,
        brake = 95,
        drag = 4.0,
        steerRate = 2.3,
        driftSteerRate = 2.95,
        normalGrip = 10.5,
        driftGrip = 4.2,
        driftSpeedThreshold = 28,
    },

    ai = {
        lookAhead = 10,
        itemUseMin = 1.2,
        itemUseMax = 3.8,
        avoidKartDist = 24,
        avoidHazardDist = 20,
    },

    track = {
        offTrackDistance = 40,
        waypointReachDistance = 16,
    },

    combat = {
        hitSlowFactor = 0.4,
        hitDuration = 1.0,
        controlLossDuration = 1.1,
    },

    items = {
        boxRespawn = 5,
        turboDuration = 1.35,
        shieldDuration = 5.0,
        pulseRadius = 42,
        pulseDuration = 0.3,
        rocketSpeed = 170,
        rocketLife = 4.2,
        spikesLife = 8.5,
        spikesRadius = 8,
    },

    debug = false,
}

local ITEM_POOL = { "rocket", "spikes", "turbo", "shield", "pulse" }

local trackFolder = Workspace:WaitForChild("Track")
local waypointsFolder = trackFolder:WaitForChild("Waypoints")
local pickupFolder = trackFolder:FindFirstChild("Pickups")
local kartsFolder = Workspace:WaitForChild("Karts")

local raceRunning = false
local finishCount = 0

local racers = {}
local pickups = {}
local rockets = {}
local spikes = {}
local shields = {}

local function log(...)
    if CONFIG.debug then
        print("[ArcadeRacer]", ...)
    end
end

local function randomFrom(list)
    return list[math.random(1, #list)]
end

local function horizontal(v)
    return Vector3.new(v.X, 0, v.Z)
end

local function getWaypoints()
    local result = {}
    for _, child in ipairs(waypointsFolder:GetChildren()) do
        if child:IsA("BasePart") then
            table.insert(result, child)
        end
    end
    table.sort(result, function(a, b)
        return tonumber(a.Name) < tonumber(b.Name)
    end)
    return result
end

local waypoints = getWaypoints()
if #waypoints < 6 then
    error("Need at least 6 waypoints in Workspace.Track.Waypoints")
end

local function findSeat(model)
    return model:FindFirstChildWhichIsA("VehicleSeat", true) or model:FindFirstChildWhichIsA("Seat", true)
end

local function getRacerByModel(model)
    for _, r in pairs(racers) do
        if r.model == model then
            return r
        end
    end
    return nil
end

local function getRacerFromPart(part)
    if not part then
        return nil
    end
    local model = part:FindFirstAncestorOfClass("Model")
    if not model then
        return nil
    end
    return getRacerByModel(model)
end

local function nearestWaypointIndex(pos, hint, window)
    local n = #waypoints
    local startIndex = hint or 1
    local w = window or n

    local best = startIndex
    local bestDist = math.huge

    for offset = -w, w do
        local idx = ((startIndex - 1 + offset) % n) + 1
        local wpPos = waypoints[idx].Position
        local d2 = (wpPos - pos).Magnitude
        if d2 < bestDist then
            bestDist = d2
            best = idx
        end
    end

    return best, bestDist
end

local function raceProgress(r)
    return math.max(0, r.lap - 1) + ((r.sampleIndex - 1) / #waypoints)
end

local function rankRacers()
    local sorted = {}
    for _, r in pairs(racers) do
        table.insert(sorted, r)
    end

    table.sort(sorted, function(a, b)
        if a.finished and b.finished then
            return a.finishOrder < b.finishOrder
        end
        if a.finished ~= b.finished then
            return a.finished
        end
        return raceProgress(a) > raceProgress(b)
    end)

    return sorted
end

local function updatePlayerAttributes()
    local ranking = rankRacers()

    local posByRacer = {}
    for i, r in ipairs(ranking) do
        posByRacer[r] = i
    end

    for _, r in pairs(racers) do
        if r.player then
            r.player:SetAttribute("Lap", r.lap)
            r.player:SetAttribute("Position", posByRacer[r] or 0)
            r.player:SetAttribute("CurrentItem", r.currentItem or "")
            r.player:SetAttribute("Finished", r.finished)
        end
    end
end

local function hitRacer(target, slowFactor, duration, controlLoss)
    if target.shieldActive then
        return
    end

    target.hitTimer = math.max(target.hitTimer, duration or CONFIG.combat.hitDuration)
    target.controlLossTimer = math.max(target.controlLossTimer, controlLoss or CONFIG.combat.controlLossDuration)
    target.speed = target.speed * (slowFactor or CONFIG.combat.hitSlowFactor)
end

local function findTargetAhead(source)
    local sorted = rankRacers()
    local sourceIndex = nil
    for i, r in ipairs(sorted) do
        if r == source then
            sourceIndex = i
            break
        end
    end
    if not sourceIndex or sourceIndex <= 1 then
        return nil
    end
    return sorted[sourceIndex - 1]
end

local function useItem(r)
    local item = r.currentItem
    if not item then
        return false
    end

    if item == "turbo" then
        r.boostTimer = math.max(r.boostTimer, CONFIG.items.turboDuration)
        r.currentItem = nil
        return true
    end

    if item == "shield" then
        r.shieldActive = true
        table.insert(shields, { owner = r, life = CONFIG.items.shieldDuration })
        r.currentItem = nil
        return true
    end

    if item == "pulse" then
        for _, other in pairs(racers) do
            if other ~= r then
                local d = (other.position - r.position).Magnitude
                if d <= CONFIG.items.pulseRadius then
                    hitRacer(other, 0.68, 0.65, 0.9)
                end
            end
        end
        table.insert(shields, { owner = r, life = CONFIG.items.pulseDuration, pulseOnly = true })
        r.currentItem = nil
        return true
    end

    if item == "spikes" then
        local part = Instance.new("Part")
        part.Name = "Spikes"
        part.Shape = Enum.PartType.Cylinder
        part.Material = Enum.Material.Metal
        part.Color = Color3.fromRGB(255, 107, 53)
        part.Size = Vector3.new(1.2, 5, 5)
        part.CFrame = CFrame.new(r.position) * CFrame.Angles(0, 0, math.rad(90))
        part.Anchored = true
        part.CanCollide = false
        part.Parent = Workspace

        table.insert(spikes, {
            part = part,
            owner = r,
            life = CONFIG.items.spikesLife,
            radius = CONFIG.items.spikesRadius,
        })
        r.currentItem = nil
        return true
    end

    if item == "rocket" then
        local target = findTargetAhead(r)
        if not target then
            return false
        end

        local proj = Instance.new("Part")
        proj.Name = "Rocket"
        proj.Material = Enum.Material.Neon
        proj.Color = Color3.fromRGB(251, 86, 7)
        proj.Size = Vector3.new(1, 1, 2.2)
        proj.CanCollide = false
        proj.Anchored = true
        proj.CFrame = CFrame.new(r.position + Vector3.new(0, 2.6, 0))
        proj.Parent = Workspace

        table.insert(rockets, {
            part = proj,
            owner = r,
            target = target,
            heading = r.heading,
            speed = CONFIG.items.rocketSpeed,
            life = CONFIG.items.rocketLife,
        })

        r.currentItem = nil
        return true
    end

    return false
end

local function moveRacer(r, dt, throttle, steer, drifting)
    if r.finished then
        throttle = 0
        steer = 0
        drifting = false
    end

    if r.hitTimer > 0 then
        r.hitTimer = math.max(0, r.hitTimer - dt)
    end

    if r.controlLossTimer > 0 then
        r.controlLossTimer = math.max(0, r.controlLossTimer - dt)
        steer = steer + math.sin(os.clock() * 18) * 0.6
    end

    if throttle > 0 then
        r.speed = r.speed + CONFIG.move.accel * dt
    elseif throttle < 0 then
        r.speed = r.speed - CONFIG.move.brake * dt
    else
        r.speed = r.speed + (0 - r.speed) * math.clamp(CONFIG.move.drag * dt, 0, 1)
    end

    if r.boostTimer > 0 then
        r.boostTimer = math.max(0, r.boostTimer - dt)
    end

    local top = r.boostTimer > 0 and CONFIG.move.boostMaxSpeed or CONFIG.move.maxSpeed
    r.speed = math.clamp(r.speed, CONFIG.move.reverseSpeed, top)

    local speedRatio = math.clamp(math.abs(r.speed) / math.max(top, 1), 0, 1)
    local steerRate = drifting and CONFIG.move.driftSteerRate or CONFIG.move.steerRate

    r.heading = r.heading + steer * steerRate * speedRatio * dt

    local driftFactor = drifting and 0.62 or 0.15
    local sideTarget = steer * math.abs(r.speed) * driftFactor
    local sideLerp = drifting and 2.8 or 7.0
    r.sideSlip = r.sideSlip + (sideTarget - r.sideSlip) * math.clamp(sideLerp * dt, 0, 1)

    local forward = Vector3.new(math.sin(r.heading), 0, math.cos(r.heading))
    local side = Vector3.new(forward.Z, 0, -forward.X)
    local desiredVel = forward * r.speed + side * r.sideSlip

    local grip = drifting and CONFIG.move.driftGrip or CONFIG.move.normalGrip
    local blend = 1 - math.exp(-grip * dt)
    r.velocity = r.velocity:Lerp(desiredVel, blend)

    r.position = r.position + (r.velocity * dt)

    local idx, dist = nearestWaypointIndex(r.position, r.sampleIndex, 16)
    r.lastSampleIndex = r.sampleIndex
    r.sampleIndex = idx

    if dist > CONFIG.track.offTrackDistance then
        local wp = waypoints[idx].Position
        r.position = wp + Vector3.new(0, 3, 0)
        r.speed = r.speed * 0.45
        r.velocity = r.velocity * 0.3
    end

    local nearEnd = r.lastSampleIndex > math.floor(#waypoints * 0.84)
    local nearStart = r.sampleIndex < math.floor(#waypoints * 0.14)
    if nearEnd and nearStart and r.speed > 10 and not r.finished then
        r.lap = r.lap + 1
        if r.lap > CONFIG.totalLaps then
            r.lap = CONFIG.totalLaps
            r.finished = true
            finishCount = finishCount + 1
            r.finishOrder = finishCount
            log(r.name .. " finished at position " .. tostring(r.finishOrder))
        end
    end

    if r.model.PrimaryPart then
        local y = r.model.PrimaryPart.Position.Y
        r.model:PivotTo(CFrame.new(r.position.X, y, r.position.Z) * CFrame.Angles(0, r.heading, 0))

        local current = r.model.PrimaryPart.AssemblyLinearVelocity
        r.model.PrimaryPart.AssemblyLinearVelocity = Vector3.new(r.velocity.X, current.Y, r.velocity.Z)
    end
end

local function updateAI(r, dt)
    r.itemTimer = r.itemTimer - dt
    if r.itemTimer <= 0 then
        r.itemTimer = math.random() * (CONFIG.ai.itemUseMax - CONFIG.ai.itemUseMin) + CONFIG.ai.itemUseMin
        useItem(r)
    end

    local lookAhead = CONFIG.ai.lookAhead
    local targetIdx = ((r.sampleIndex - 1 + lookAhead) % #waypoints) + 1
    local targetPos = waypoints[targetIdx].Position

    local toTarget = horizontal(targetPos - r.position)

    for _, other in pairs(racers) do
        if other ~= r then
            local away = horizontal(r.position - other.position)
            local d = away.Magnitude
            if d > 0 and d < CONFIG.ai.avoidKartDist then
                toTarget = toTarget + away.Unit * (10 / d)
            end
        end
    end

    if toTarget.Magnitude < 0.001 then
        return 0, 0, false
    end

    local desiredDir = toTarget.Unit
    local forward = Vector3.new(math.sin(r.heading), 0, math.cos(r.heading))
    local crossY = forward.X * desiredDir.Z - forward.Z * desiredDir.X
    local steer = math.clamp(-crossY * 3.1, -1, 1)

    local targetSpeed = math.abs(steer) > 0.62 and 58 or 82
    if r.speed < targetSpeed then
        return 1, steer, math.abs(steer) > 0.65 and math.abs(r.speed) > CONFIG.move.driftSpeedThreshold
    end

    return 0.2, steer, math.abs(steer) > 0.68 and math.abs(r.speed) > CONFIG.move.driftSpeedThreshold
end

local function updatePlayer(r)
    if not r.seat or not r.seat:IsDescendantOf(r.model) then
        return 0, 0, false
    end

    local throttle = 0
    local steer = 0

    if r.seat:IsA("VehicleSeat") then
        throttle = r.seat.ThrottleFloat
        steer = r.seat.SteerFloat
    else
        throttle = r.seat.Throttle
        steer = r.seat.Steer
    end

    local drifting = math.abs(steer) > 0.2 and math.abs(r.speed) > CONFIG.move.driftSpeedThreshold

    if r.currentItem and math.random() < 0.007 then
        useItem(r)
    end

    return throttle, steer, drifting
end

local function updateProjectiles(dt)
    for i = #rockets, 1, -1 do
        local rocket = rockets[i]
        rocket.life = rocket.life - dt

        if rocket.life <= 0 or not rocket.target or not rocket.target.model.Parent then
            if rocket.part then
                rocket.part:Destroy()
            end
            table.remove(rockets, i)
        else
            local toTarget = horizontal(rocket.target.position - rocket.part.Position)
            if toTarget.Magnitude > 0.001 then
                local desiredHeading = math.atan2(toTarget.X, toTarget.Z)
                local delta = desiredHeading - rocket.heading
                while delta > math.pi do
                    delta = delta - math.pi * 2
                end
                while delta < -math.pi do
                    delta = delta + math.pi * 2
                end
                rocket.heading = rocket.heading + math.clamp(delta, -3.2 * dt, 3.2 * dt)
            end

            local f = Vector3.new(math.sin(rocket.heading), 0, math.cos(rocket.heading))
            local newPos = rocket.part.Position + f * rocket.speed * dt
            rocket.part.CFrame = CFrame.new(newPos, newPos + f)

            for _, target in pairs(racers) do
                if target ~= rocket.owner then
                    local d = (target.position - rocket.part.Position).Magnitude
                    if d < 7 then
                        hitRacer(target, 0.15, 1.2, 0.9)
                        rocket.part:Destroy()
                        table.remove(rockets, i)
                        break
                    end
                end
            end
        end
    end

    for i = #spikes, 1, -1 do
        local s = spikes[i]
        s.life = s.life - dt

        if s.life <= 0 or not s.part then
            if s.part then
                s.part:Destroy()
            end
            table.remove(spikes, i)
        else
            for _, target in pairs(racers) do
                if target ~= s.owner then
                    local d = (target.position - s.part.Position).Magnitude
                    if d <= s.radius then
                        hitRacer(target, 0.55, 0.8, 1.4)
                        s.part:Destroy()
                        table.remove(spikes, i)
                        break
                    end
                end
            end
        end
    end

    for i = #shields, 1, -1 do
        local sh = shields[i]
        sh.life = sh.life - dt

        if sh.life <= 0 then
            if sh.owner then
                sh.owner.shieldActive = false
            end
            table.remove(shields, i)
        end
    end
end

local function bindPickups()
    if not pickupFolder then
        return
    end

    for _, p in ipairs(pickupFolder:GetChildren()) do
        if p:IsA("BasePart") then
            pickups[p] = {
                active = true,
                respawn = 0,
            }

            p.Touched:Connect(function(hit)
                local box = pickups[p]
                if not box or not box.active then
                    return
                end

                local racer = getRacerFromPart(hit)
                if not racer or racer.currentItem then
                    return
                end

                racer.currentItem = randomFrom(ITEM_POOL)
                box.active = false
                box.respawn = CONFIG.items.boxRespawn
                p.Transparency = 1
                p.CanTouch = false
            end)
        end
    end
end

local function updatePickups(dt)
    for p, info in pairs(pickups) do
        if not info.active then
            info.respawn = info.respawn - dt
            if info.respawn <= 0 then
                info.active = true
                p.Transparency = 0
                p.CanTouch = true
            end
        end
    end
end

local function registerKart(model)
    if not model:IsA("Model") or not model.PrimaryPart then
        return
    end

    local seat = findSeat(model)
    if not seat then
        warn("Kart model has no seat:", model.Name)
        return
    end

    if getRacerByModel(model) then
        return
    end

    local userId = model:GetAttribute("DriverUserId")
    local player = nil
    if typeof(userId) == "number" and userId > 0 then
        player = Players:GetPlayerByUserId(userId)
    end

    local spawnIdx = (#racers % #waypoints) + 1
    local spawnPos = waypoints[spawnIdx].Position + Vector3.new(0, 3, 0)

    local racer = {
        model = model,
        seat = seat,
        player = player,
        name = model:GetAttribute("RacerName") or (player and player.Name) or model.Name,
        isAI = model:GetAttribute("IsAI") == true,

        position = spawnPos,
        heading = model.PrimaryPart.Orientation.Y * math.pi / 180,
        velocity = Vector3.zero,
        speed = 0,
        sideSlip = 0,

        lap = 1,
        finished = false,
        finishOrder = 0,
        sampleIndex = spawnIdx,
        lastSampleIndex = spawnIdx,

        currentItem = nil,
        boostTimer = 0,
        hitTimer = 0,
        controlLossTimer = 0,
        shieldActive = false,

        itemTimer = math.random() * (CONFIG.ai.itemUseMax - CONFIG.ai.itemUseMin) + CONFIG.ai.itemUseMin,
    }

    table.insert(racers, racer)
    model:PivotTo(CFrame.new(spawnPos))

    log("Registered racer", racer.name, "AI=", racer.isAI)
end

for _, kart in ipairs(kartsFolder:GetChildren()) do
    registerKart(kart)
end

kartsFolder.ChildAdded:Connect(function(child)
    task.wait(0.1)
    registerKart(child)
end)

bindPickups()

local function raceLoop(dt)
    if #racers == 0 then
        return
    end

    for _, r in pairs(racers) do
        if not r.model.Parent then
            continue
        end

        local throttle, steer, drifting
        if r.isAI then
            throttle, steer, drifting = updateAI(r, dt)
        else
            throttle, steer, drifting = updatePlayer(r)
        end

        moveRacer(r, dt, throttle, steer, drifting)
    end

    updatePickups(dt)
    updateProjectiles(dt)
    updatePlayerAttributes()

    local allFinished = true
    for _, r in pairs(racers) do
        if not r.finished then
            allFinished = false
            break
        end
    end

    if allFinished then
        raceRunning = false
        local ranking = rankRacers()
        print("=== RACE FINISHED ===")
        for i, r in ipairs(ranking) do
            print(i, r.name, "Lap", r.lap)
        end
    end
end

raceRunning = true
print("Arcade racer script started with", tostring(#racers), "racers")

local last = os.clock()
RunService.Heartbeat:Connect(function()
    if not raceRunning then
        return
    end

    local now = os.clock()
    local dt = math.min(now - last, 0.05)
    last = now

    raceLoop(dt)
end)
