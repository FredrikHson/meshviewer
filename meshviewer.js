print("initing");
RAD = 0.0174532925199;
filename = getoptionalstring("file", "");

shadowbuffer = createrendertarget(1024, 1024, 1, GL_RGBA, GL_RGBA32F, 0);
gbuffer = createrendertarget(1, 1, 2, GL_RGBA, GL_RGBA32F, 1);
accumbuffer = createrendertarget(1, 1, 1, GL_RGBA, GL_RGBA32F, 1);

if(filename == "")
{
    mesh = generateplane(10, 10, 1, 1);
}
else
{
    mesh = loadmesh(filename);
    setwindowtitle("meshviewer ".concat(filename));
}

ext = filename.substr(filename.lastIndexOf('.') + 1);

bbox = getmeshbbox(mesh);
meshshader = loadshader("mesh.vert", "gbuf.frag", "mesh.geom", 0, 0);
deferred = loadshader("blit.vert", "deferred.frag", 0, 0, 0);
post = loadshader("blit.vert", "post.frag", 0, 0, 0);
//deferred = loadshader("blit.vert", "worldspacerecovery.frag", 0, 0, 0);
shadowbufshader = loadshader("shadowbuf.vert", "shadowbuf.frag", 0, 0, 0);
wireframeshader = loadshader("mesh.vert", "wireframe.frag", 0, 0, 0);
blit = loadshader("blit.vert", "blit.frag", 0, 0, 0);

plane = generateplane(50);

clearcolor = [ 0, 0, 0, 0 ];
matcolor = [1, 1, 1];
mathardness = 0.25;
matspec = 0.1;
angle = [45, 22.5];
lightdir = [0, 0];
pos = [0, 0];
zoom = 0;
up = "+Z";
cavityscale = 0.5;
grid = 0;
jitter = [
             0.375, 0.4375,  0.625, 0.0625, 0.875, 0.1875, 0.125, 0.0625,
             0.375, 0.6875, 0.875, 0.375, 0.625, 0.5625, 0.375, 0.9375,
             0.625, 0.3125, 0.125, 0.5625, 0.125, 0.8325, 0.375, 0.1875,
             0.875, 0.9375, 0.875, 0.6875, 0.125, 0.3125, 0.625, 0.8125
          ];


function readconfigvalue(configname, defvalue)
{
    var finalvalue;

    if(config == undefined)
    {
        return defvalue;
    }

    if(config.defaults != undefined)
    {
        if(config.defaults[configname] != undefined)
        {
            finalvalue = config.defaults[configname];
        }
    }

    if(config[ext] != undefined)
    {
        if(config[ext][configname] != undefined)
        {
            finalvalue = config[ext][configname];
        }
    }

    if(finalvalue != undefined)
    {
        return finalvalue;
    }
    else
    {
        return defvalue;
    }
}

function loadconfig()
{
    try
    {
        jsonstring = File.read("config.json");
        config = JSON.parse(jsonstring);
        jsonstring = 0;
    }
    catch(error)
    {
    }

    matcolor = readconfigvalue("matcolor", [1, 1, 1]);
    matspec = readconfigvalue("matspec", 0.25);;
    mathardness = readconfigvalue("mathardness", 0.25);;
    angle = readconfigvalue("angle", [45, -22.5]);
    angle[0] *= RAD;
    angle[1] *= RAD;
    lightdir = readconfigvalue("lightangle", [0, 0]);
    lightdir[0] *= RAD;
    lightdir[1] *= RAD;
    zoom = readconfigvalue("zoom", -2);
    clearcolor = readconfigvalue("clear", [0, 0, 0, 1]);
    pos = readconfigvalue("position", [0, 0]);
    up = readconfigvalue("up", "+Z");
    cavityscale = readconfigvalue("cavityscale", 0);
}

//print(process.env);
loadconfig();


center =
{
x:
    (bbox.max_x + bbox.min_x) / 2.0,
y:
    (bbox.max_y + bbox.min_y) / 2.0,
z:
    (bbox.max_z + bbox.min_z) / 2.0
};
xdist = bbox.max_x - bbox.min_x;
ydist = bbox.max_y - bbox.min_y;
zdist = bbox.max_z - bbox.min_z;
largestdist = xdist;

if(ydist > largestdist)
{
    largestdist = ydist;
}

if(zdist > largestdist)
{
    largestdist = zdist;
}

function rgb2hsv(ic)
{
    out = [0, 0, 0];
    min = ic[0] < ic[1] ? ic[0] : ic[1];
    min = min < ic[2] ? min : ic[2];
    max = ic[0] > ic[1] ? ic[0] : ic[1];
    max = max > ic[2] ? max : ic[2];
    out[2] = max;
    delta = max - min;

    if(delta < 0.00001)
    {
        out[0] = 0;
        out[1] = 0;
        return out;
    }

    if(max > 0.0)
    {
        out[1] = delta / max;
    }
    else
    {
        out[0] = 0;
        out[1] = 0;
        return out;
    }

    if(ic[0] >= max)
    {
        out[0] = (ic[1] - ic[2]) / delta;
    }
    else if(ic[1] >= max)
    {
        out[0] = 2.0 + (ic[2] - ic[0]) / delta;
    }
    else
    {
        out[0] = 4.0 + (ic[0] - ic[1]) / delta;
    }

    out[0] *= 60;
    out[0] = out[0] <= 0.0 ? 0.0 : out[0] >= 360.0 ? 360.0 : out[0];
    out[1] = out[1] <= 0.0 ? 0.0 : out[1] >= 1.0 ? 1.0 : out[1];
    out[2] = out[2] <= 0.0 ? 0.0 : out[2] >= 1.0 ? 1.0 : out[2];
    return out;
}

function hsv2rgb(ic)
{
    // clamp input values to avoid it going white when you have saturation set to less than 1 and increasing the value
    ic[0] = ic[0] <= 0.0 ? 0.0 : ic[0] >= 360.0 ? 360.0 : ic[0];
    ic[1] = ic[1] <= 0.0 ? 0.0 : ic[1] >= 1.0 ? 1.0 : ic[1];
    ic[2] = ic[2] <= 0.0 ? 0.0 : ic[2] >= 1.0 ? 1.0 : ic[2];
    out = [0, 0, 0];

    if(ic[1] <= 0.0)
    {
        out[0] = out[1] = out[2] = ic[2];
    }

    hh = ic[0];

    if(hh >= 360.0)
    {
        hh = 0.0;
    }

    hh /= 60.0;
    i = hh | 0;
    ff = hh - i;
    p = ic[2] * (1.0 - ic[1]);
    q = ic[2] * (1.0 - (ic[1] * ff));
    t = ic[2] * (1.0 - (ic[1] * (1.0 - ff)));

    switch(i)
    {
        case 0:
            out[0] = ic[2];
            out[1] = t;
            out[2] = p;
            break;

        case 1:
            out[0] = q;
            out[1] = ic[2];
            out[2] = p;
            break;

        case 2:
            out[0] = p;
            out[1] = ic[2];
            out[2] = t;
            break;

        case 3:
            out[0] = p;
            out[1] = q;
            out[2] = ic[2];
            break;

        case 4:
            out[0] = t;
            out[1] = p;
            out[2] = ic[2];
            break;

        case 5:
        default:
            out[0] = ic[2];
            out[1] = p;
            out[2] = q;
            break;
    }

    out[0] = out[0] <= 0.0 ? 0.0 : out[0] >= 1.0 ? 1.0 : out[0];
    out[1] = out[1] <= 0.0 ? 0.0 : out[1] >= 1.0 ? 1.0 : out[1];
    out[2] = out[2] <= 0.0 ? 0.0 : out[2] >= 1.0 ? 1.0 : out[2];
    return out;
}

var framenumber = 0;

function handleinput()
{
    if(KEY_G & PRESSED_NOW)
    {
        grid = grid ? 0 : 1;
    }

    if(KEY_1 & PRESSED)
    {
        hsv = rgb2hsv(matcolor);
        hsv[0] -= MOUSE_DELTA_X * 0.001 * 360;
        matcolor = hsv2rgb(hsv);
    }

    if(KEY_2 & PRESSED)
    {
        hsv = rgb2hsv(matcolor);
        hsv[1] -= MOUSE_DELTA_X * 0.001;
        matcolor = hsv2rgb(hsv);
    }

    if(KEY_3 & PRESSED)
    {
        hsv = rgb2hsv(matcolor);
        hsv[2] -= MOUSE_DELTA_X * 0.001;
        matcolor = hsv2rgb(hsv);
    }

    if(KEY_4 & PRESSED)
    {
        matspec -= MOUSE_DELTA_X * 0.001;

        if(matspec > 1.0)
        {
            matspec = 1.0;
        }

        if(matspec < 0.0)
        {
            matspec = 0.0;
        }
    }

    if(KEY_5 & PRESSED)
    {
        mathardness -= MOUSE_DELTA_X * 0.001;

        if(mathardness > 1.0)
        {
            mathardness = 1.0;
        }

        if(mathardness < 0.005)
        {
            mathardness = 0.005;
        }
    }

    if(KEY_C & PRESSED)
    {
        cavityscale -= MOUSE_DELTA_X * 0.005;

        if(cavityscale < 0)
        {
            cavityscale = 0;
        }

        if(cavityscale > 4)
        {
            cavityscale = 4;
        }
    }

    if(KEY_R & PRESSED_NOW)
    {
        loadconfig();
    }

    if(KEY_S & PRESSED_NOW)
    {
        print();
        print("\"angle\": [", angle[0] / RAD, ",", angle[1] / RAD, "],");
        print("\"cavityscale\":", cavityscale, ",");
        print("\"lightangle\": [", lightdir[0] / RAD, ",", lightdir[1] / RAD, "],");
        print("\"matcolor\":", matcolor, ",");
        print("\"mathardness\":", mathardness, ",");
        print("\"matspec\":", matspec, ",");
        print("\"position\":", pos, ",");
        print("\"zoom\":", zoom, ",");
        print();
        print(rgb2hsv(matcolor));
    }

    if((KEY_LEFT_SHIFT & PRESSED || KEY_RIGHT_SHIFT & PRESSED))
    {
        if(MOUSE_INSIDE)
        {
            if(MOUSE_1 & PRESSED)
            {
                lightdir[0] -= MOUSE_DELTA_X * 0.01;
                lightdir[1] -= MOUSE_DELTA_Y * 0.01;
            }
        }

        if(KEY_Z & PRESSED)
        {
            up = "-Z";
        }

        if(KEY_Y & PRESSED)
        {
            up = "-Y";
        }

        if(KEY_X & PRESSED)
        {
            up = "-X";
        }
    }
    else
    {
        if(MOUSE_INSIDE)
        {
            if(MOUSE_1 & PRESSED)
            {
                framenumber = 0;
                angle[0] += MOUSE_DELTA_X * 0.01;
                angle[1] += MOUSE_DELTA_Y * 0.01;
            }
        }

        if(KEY_Z & PRESSED)
        {
            up = "+Z";
        }

        if(KEY_Y & PRESSED)
        {
            up = "+Y";
        }

        if(KEY_X & PRESSED)
        {
            up = "+X";
        }

        if(MOUSE_3 & PRESSED)
        {
            pos[0] -= MOUSE_DELTA_X * 0.004;
            pos[1] += MOUSE_DELTA_Y * 0.004;
        }

        if(MOUSE_2 & PRESSED)
        {
            zoom += MOUSE_DELTA_Y * 0.01;
        }
    }
}

function loop()
{
    handleinput();
    lightvector = {x: 0, y: 0, z: 1};
    model = mat4loadidentity();
    model = mat4mul(model, mat4settranslation(-center.x, -center.y, -center.z));
    model = mat4mul(model, mat4setscale(1 / largestdist));

    switch(up)
    {
        case "+Z":
            model = mat4mul(model, mat4setrotation(1.5708, 1, 0, 0));
            break;

        case "-Z":
            model = mat4mul(model, mat4setrotation(1.5708, -1, 0, 0));
            break;

        case "+X":
            model = mat4mul(model, mat4setrotation(1.5708, 0, 0, -1));
            break;

        case "-X":
            model = mat4mul(model, mat4setrotation(1.5708, 0, 0, 1));
            break;

        case "-Y":
            model = mat4mul(model, mat4setrotation(1.5708 * 2, 1, 0, 0));
            break;
    }

    model = mat4mul(model, mat4setrotation(angle[0], 0, 1, 0));
    model = mat4mul(model, mat4setrotation(angle[1], 1, 0, 0));
    shadowmat = model;
    shadowmat = mat4mul(shadowmat, mat4setrotation(lightdir[0], 0, 1, 0));
    shadowmat = mat4mul(shadowmat, mat4setrotation(lightdir[1], 1, 0, 0));
    lightmat = mat4loadidentity();
    lightmat  = mat4mul(lightmat, mat4setrotation(lightdir[0], 0, 1, 0));
    lightmat  = mat4mul(lightmat, mat4setrotation(lightdir[1], 1, 0, 0));
    lightvector = vec3mat4mul(lightvector, mat4invert((lightmat)));
    beginpass(shadowbuffer);
    {
        wireframe(0);
        depthtest(1);
        culling(CULL_NONE);
        clear(0, 0, 0, 1);
        cleardepth();
        view = mat4settranslation(0, 0, -2.0);
        persp = mat4setperspective(0.785398, 1, 0.1, 1000.0);
        bindshader(shadowbufshader);
        bindattribute("in_Position", MESH_FLAG_POSITION);
        bindattribute("in_Normals", MESH_FLAG_NORMAL);
        setuniformmat4("modelview", mat4mul(shadowmat, view));
        setuniformmat4("persp", persp);
        drawmesh(mesh);
        bindshader(-1);
    }
    endpass();

    if(KEY_W & PRESSED)
    {
        wireframe(1);
    }
    maxsamples=Math.min(16,16);
    for(framenumber = 0; framenumber < maxsamples; framenumber++)
    {
        beginpass(gbuffer);
        {
            depthtest(1);
            culling(CULL_BACK);
            clear(clearcolor[0], clearcolor[1], clearcolor[2], clearcolor[3], 0);
            clear(0, 0, 0, 1, 1);
            clear(0, 0, 0, 1, 2);
            //clear(0.0, 0.0, 0.0, 0.0);
            cleardepth();
            view = mat4settranslation(pos[0], pos[1], zoom);
            persp = mat4setperspective(0.785398, RENDER_WIDTH / RENDER_HEIGHT, 0.1, 1000.0);

            if(framenumber < 16)
            {
                persp = mat4mul(persp, mat4settranslation(1 / RENDER_WIDTH * jitter[framenumber * 2], 1 / RENDER_HEIGHT * jitter[framenumber * 2 + 1], 0));
            }

            perspmodelviewmat = mat4mul(mat4mul(model, view), persp);
            bindshader(meshshader);
            bindattribute("in_Position", MESH_FLAG_POSITION);
            bindattribute("in_Normals", MESH_FLAG_NORMAL);
            setuniformmat4("modelview", mat4mul(model, view));
            setuniformmat4("perspmodelview", perspmodelviewmat);
            setuniformmat4("shadowmodelview", mat4mul(shadowmat, view));
            setuniformmat4("persp", persp);
            setuniformf("lightvector", lightvector.x, lightvector.y, lightvector.z);
            setuniformf("materialcolor", matcolor[0], matcolor[1], matcolor[2]);
            drawmesh(mesh);
            bindshader(-1);
        }
        endpass();
        beginpass(accumbuffer);
        {
            depthtest(0);

            if(framenumber == 0)
            {
                clear(0, 0, 0, 1);
            }

            //if(framenumber < 16)
            //{
            //framenumber += 1;
            blend(1);
            blendfunc(GL_ONE, GL_ONE);
            culling(CULL_NONE);
            cleardepth();
            view = mat4settranslation(pos[0], pos[1], zoom);
            persp = mat4setperspective(0.785398, RENDER_WIDTH / RENDER_HEIGHT, 0.1, 1000.0);
            if(framenumber < 16)
            {
                persp = mat4mul(persp, mat4settranslation(1 / RENDER_WIDTH * jitter[framenumber * 2], 1 / RENDER_HEIGHT * jitter[framenumber * 2 + 1], 0));
            }
            perspmodelviewmat = mat4mul(mat4mul(model, view), persp);
            bindshader(deferred);
            bindattribute("in_Position", MESH_FLAG_POSITION);
            bindattribute("in_Uv", MESH_FLAG_TEXCOORD0);
            setuniformf("lightvector", lightvector.x, lightvector.y, lightvector.z);
            setuniformf("spec", matspec);
            setuniformi("grid", grid);
            setuniformf("hardness", mathardness);
            setuniformf("cavityscale", cavityscale + 0.5);
            setuniformf("clearcolor", clearcolor[0], clearcolor[1], clearcolor[2], clearcolor[3]);
            setuniformmat4("modelview", mat4mul(model, view));
            setuniformmat4("shadowmodelview", mat4mul(shadowmat, view));
            setuniformmat4("invfinal", mat4invert(perspmodelviewmat));
            bindrendertarget("normal", gbuffer, 1);
            bindrendertarget("diffuse", gbuffer, 0);
            drawmesh(plane);
            bindshader(-1);
            //}
            blend(0);
        }
        endpass();
    }

    beginpass();
    {
        depthtest(0);
        clear(0, 0, 0, 1);
        culling(CULL_NONE);
        cleardepth();
        bindshader(post);
        bindattribute("in_Position", MESH_FLAG_POSITION);
        bindattribute("in_Uv", MESH_FLAG_TEXCOORD0);
        setuniformf("samples", maxsamples);
        bindrendertarget("diffuse", accumbuffer, 0);
        drawmesh(plane);
        bindshader(-1);
    }
    endpass();
    wireframe(0);

    if(KEY_D & PRESSED)
    {
        debugmode(DEBUG_RENDERALLSTEPS);
        debugclip(1);
    }
    else
    {
        debugmode(DEBUG_OFF);
    }

    //debugmode(DEBUG_RENDERALLSTEPS);

    if(KEY_Q & PRESSED)
    {
        exit();
    }

    //debugrange(-10,100);
    //debugrange(-0.010,0.01);
}
