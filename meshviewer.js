print("initing");
RAD = 0.0174532925199;
meshfilename = getoptionalstring("file", "");
shadowbufres = [4096, 1024, 1024, 1024];
shadowbuffer = [
                   createrendertarget(shadowbufres[0], shadowbufres[0], 1, GL_RED, GL_R32F, 0),
                   createrendertarget(shadowbufres[1], shadowbufres[1], 1, GL_RED, GL_R32F, 0),
                   createrendertarget(shadowbufres[2], shadowbufres[2], 1, GL_RED, GL_R32F, 0),
                   createrendertarget(shadowbufres[3], shadowbufres[3], 1, GL_RED, GL_R32F, 0)
                ];
gbuffer = createrendertarget(1, 1, 2, GL_RGBA, GL_RGBA32F, 1);
accumbuffer = createrendertarget(1, 1, 1, GL_RGBA, GL_RGBA32F, 1);
floor = loadmesh("floor.obj");



if(meshfilename == "")
{
    mesh = generateplane(10, 10, 1, 1);
}
else
{
    mesh = loadmesh(meshfilename);
    setwindowtitle("meshviewer ".concat(meshfilename));
}

ext = meshfilename.substr(meshfilename.lastIndexOf('.') + 1).toLowerCase();

bbox = getmeshbbox(mesh);
meshshader = loadshader("mesh.vert", "gbuf.frag", "mesh.geom", 0, 0);
deferred = loadshader("blit.vert", "deferred.frag", 0, 0, 0);
post = loadshader("blit.vert", "post.frag", 0, 0, 0);
shadowbufshader = loadshader("shadowbuf.vert", "shadowbuf.frag", 0, 0, 0);
wireframeshader = loadshader("mesh.vert", "wireframe.frag", 0, 0, 0);
blit = loadshader("blit.vert", "blit.frag", 0, 0, 0);
drawwireframe = false;
doublesided = 0;
drawfloor = false;
drawfloorshadowbuf = [false, false, false, false];

plane = generateplane(50);

clearcolor = [ 0, 0, 0, 0 ];
matcolor = [1, 1, 1];
matgloss = 0.25;
matspec = 0.1;
angle = [45, 22.5];
lightdir = [[0, 0], [0, 0], [0, 0], [0, 0]];
lightcolor = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
pos = [0, 0];
zoom = 0;
up = "+Z";
cavityscale = 0.5;
grid = 0;
colorgrid = 0;
use_shadows = [0, 0, 0, 0];
shadowangle = [1.0, 1.0, 1.0, 1.0];
calculatenormals = 0;
maxsamples = 65536;
center = {x: 0, y: 0, z: 0};

function getconfigvalue(configname, conf)
{
    splitname = configname.split(".");

    for(i = 0; i < splitname.length; i++)
    {
        if(conf[splitname[i]] != undefined)
        {
            conf = conf[splitname[i]];
        }
        else
        {
            return undefined;
        }
    }

    return conf;
}


function readconfigvalue(configname, defvalue)
{
    var finalvalue;

    if(config == undefined)
    {
        return defvalue;
    }

    if(config.defaults != undefined)
    {
        c = getconfigvalue(configname, config.defaults);

        if(c != undefined)
        {
            finalvalue = c;
        }
    }

    if(config[ext] != undefined)
    {
        c = getconfigvalue(configname, config[ext]);

        if(c != undefined)
        {
            finalvalue = c;
        }

        if(config[ext]["path"] != undefined)
        {
            splitpath = meshfilename.split("/");
            pathoverrides = config[ext]["path"];

            for(i = splitpath.length; i > 0; i--)
            {
                for(name in pathoverrides)
                {
                    reg = new RegExp(name, "i");

                    if(reg.test(splitpath[i])  == true)
                    {
                        c = getconfigvalue(configname, pathoverrides[name]);

                        if(c != undefined)
                        {
                            return c;
                        }
                    }
                }
            }
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
        watchfile("config.json");
    }
    catch(error)
    {
        print("failed to load config.json");
    }

    matcolor = readconfigvalue("matcolor", [.62, .47, .32]);
    matspec = readconfigvalue("matspec", 0.08);;
    matgloss = readconfigvalue("matgloss", 0.7);;
    angle = readconfigvalue("angle", [20, -6]);
    lightdir[0] = readconfigvalue("light1.angle", [-20, -30]);
    lightdir[1] = readconfigvalue("light2.angle", [-10, -50]);
    lightdir[2] = readconfigvalue("light3.angle", [15, 48]);
    lightdir[3] = readconfigvalue("light4.angle", [0, 0]);
    lightcolor[0] = readconfigvalue("light1.color", [1, 1, 1]);
    lightcolor[1] = readconfigvalue("light2.color", [0.4, 0.35, 0.35]);
    lightcolor[2] = readconfigvalue("light3.color", [0.4, .3, 0]);
    lightcolor[3] = readconfigvalue("light4.color", [0.3, 0.3, 0.3]);
    shadowangle[0] = readconfigvalue("light1.shadowangle", 10);
    shadowangle[1] = readconfigvalue("light2.shadowangle", 70);
    shadowangle[2] = readconfigvalue("light3.shadowangle", 70);
    shadowangle[3] = readconfigvalue("light4.shadowangle", 70);
    use_shadows[0] = readconfigvalue("light1.shadows", 1);
    use_shadows[1] = readconfigvalue("light2.shadows", 1);
    use_shadows[2] = readconfigvalue("light3.shadows", 1);
    use_shadows[3] = readconfigvalue("light4.shadows", 0);
    drawfloorshadowbuf[0] = readconfigvalue("light1.floorshadows", 1);
    drawfloorshadowbuf[1] = readconfigvalue("light2.floorshadows", 0);
    drawfloorshadowbuf[2] = readconfigvalue("light3.floorshadows", 0);
    drawfloorshadowbuf[3] = readconfigvalue("light4.floorshadows", 0);
    zoom = readconfigvalue("zoom", -1.68);
    clearcolor = readconfigvalue("clear", [0, 0, 0, 1]);
    pos = readconfigvalue("position", [0, 0]);
    up = readconfigvalue("up", "+Z");
    cavityscale = readconfigvalue("cavityscale", 0.08);
    drawfloor = readconfigvalue("drawfloor", 1);
    doublesided = readconfigvalue("doublesided", 0);
    calculatenormals = readconfigvalue("calculatenormals", 0);
    colorgrid = readconfigvalue("colorgrid", 0);

    // convert degress to radians
    for(i = 0; i < 4; i++)
    {
        lightdir[i][0] *= RAD;
        lightdir[i][1] *= RAD;
    }

    angle[0] *= RAD;
    angle[1] *= RAD;
}

loadconfig();


function setupcenter()
{
    center.x = (bbox.max_x + bbox.min_x) / 2.0;
    center.y = (bbox.max_y + bbox.min_y) / 2.0;
    center.z = (bbox.max_z + bbox.min_z) / 2.0;
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
}

setupcenter();

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
    setwindowtitle("meshviewer ".concat(meshfilename));

    if(KEY_1 & PRESSED)
    {
        hsv = rgb2hsv(matcolor);
        hsv[0] -= MOUSE_DELTA_X * 1 / WINDOW_WIDTH * 360;
        matcolor = hsv2rgb(hsv);
    }

    if(KEY_2 & PRESSED)
    {
        hsv = rgb2hsv(matcolor);
        hsv[1] -= MOUSE_DELTA_X * 1 / WINDOW_WIDTH;

        if(hsv[1] < 0.001)
        {
            hsv[1] = 0.001;
        }

        matcolor = hsv2rgb(hsv);
    }

    if(KEY_3 & PRESSED)
    {
        hsv = rgb2hsv(matcolor);
        hsv[2] -= MOUSE_DELTA_X * 1 / WINDOW_WIDTH;

        if(hsv[2] < 0.001)
        {
            hsv[2] = 0.001;
        }

        matcolor = hsv2rgb(hsv);
    }

    if(KEY_4 & PRESSED)
    {
        matspec -= MOUSE_DELTA_X * 1 / WINDOW_WIDTH;

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
        matgloss -= MOUSE_DELTA_X * 1 / WINDOW_WIDTH;

        if(matgloss > 1.0)
        {
            matgloss = 1.0;
        }

        if(matgloss < 0.005)
        {
            matgloss = 0.005;
        }
    }

    if(KEY_C & PRESSED)
    {
        cavityscale -= MOUSE_DELTA_X * 4 / WINDOW_WIDTH;

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

    if(KEY_W & PRESSED_NOW)
    {
        drawwireframe = !drawwireframe;
    }

    if(KEY_F & PRESSED_NOW)
    {
        drawfloor = !drawfloor;
    }

    if(KEY_P & PRESSED_NOW)
    {
        print();
        print("\"angle\": [", angle[0] / RAD, ",", angle[1] / RAD, "],");
        print("\"cavityscale\":", cavityscale, ",");
        print("\"lightangle\": [", lightdir[0][0] / RAD, ",", lightdir[0][1] / RAD, "],");
        print("\"matcolor\":", matcolor, ",");
        print("\"matgloss\":", matgloss, ",");
        print("\"matspec\":", matspec, ",");
        print("\"position\":", pos, ",");
        print("\"zoom\":", zoom, ",");
        print("\"shadows\":", use_shadows, ",");
        print("\"drawfloor\":", drawfloor, ",");
        print("\"doublesided\":", doublesided, ",");
        print("\"shadowangle\":", shadowangle, ",");
        print();
        print(rgb2hsv(matcolor));
    }

    if((KEY_LEFT_SHIFT & PRESSED || KEY_RIGHT_SHIFT & PRESSED))
    {
        if(MOUSE_INSIDE)
        {
            if(MOUSE_1 & PRESSED)
            {
                lightdir[0][0] -= MOUSE_DELTA_X * 0.01;
                lightdir[0][1] -= MOUSE_DELTA_Y * 0.01;
            }
        }

        if(KEY_S & PRESSED)
        {
            shadowangle[0] -= MOUSE_DELTA_X * 0.05;

            if(shadowangle[0] < 0)
            {
                shadowangle[0] = 0;
            }

            if(shadowangle[0] > 360.0)
            {
                shadowangle[0] = 360.0;
            }

            setwindowtitle("shadowangle:".concat(shadowangle[0]));
            //print("shadowangle:" + shadowangle);
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

        if(KEY_G & PRESSED_NOW)
        {
            colorgrid = colorgrid ? 0 : 1;
        }
    }
    else
    {
        if(MOUSE_INSIDE)
        {
            if(MOUSE_1 & PRESSED)
            {
                angle[0] += MOUSE_DELTA_X * 0.01;
                angle[1] += MOUSE_DELTA_Y * 0.01;
            }
        }

        if(KEY_S & PRESSED_NOW)
        {
            use_shadows[0] = use_shadows[0] ? 0 : 1;
            use_shadows[1] = use_shadows[1] ? 0 : 1;
            use_shadows[2] = use_shadows[2] ? 0 : 1;
            use_shadows[3] = use_shadows[3] ? 0 : 1;
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

        if(KEY_G & PRESSED_NOW)
        {
            grid = grid ? 0 : 1;
        }
    }

    if(KEY_ANY & PRESSED)
    {
        if(framenumber > 15)
        {
            framenumber = 0;
        }
    }

    if(MOUSE_ANY & PRESSED)
    {
        framenumber = 0;
    }
}

function loop()
{
    handleinput();
    zlightvector = {x: 0, y: 0, z: 1};
    model = mat4loadidentity();
    model = mat4mul(model, mat4settranslation(-center.x, -center.y, -center.z));
    model = mat4mul(model, mat4setscale(1 / largestdist));
    floormat = mat4loadidentity();
    floormat = mat4mul(floormat, mat4setscale(2));

    switch(up)
    {
        case "+Z":
            model = mat4mul(model, mat4setrotation(1.5708, 1, 0, 0));
            floormat = mat4mul(floormat, mat4settranslation(0, -(zdist / largestdist) / 2, 0));
            break;

        case "-Z":
            model = mat4mul(model, mat4setrotation(1.5708, -1, 0, 0));
            floormat = mat4mul(floormat, mat4settranslation(0, -(zdist / largestdist) / 2, 0));
            break;

        case "+X":
            model = mat4mul(model, mat4setrotation(1.5708, 0, 0, -1));
            floormat = mat4mul(floormat, mat4settranslation(0, -(xdist / largestdist) / 2, 0));
            break;

        case "-X":
            model = mat4mul(model, mat4setrotation(1.5708, 0, 0, 1));
            floormat = mat4mul(floormat, mat4settranslation(0, -(xdist / largestdist) / 2, 0));
            break;

        case "-Y":
            model = mat4mul(model, mat4setrotation(1.5708 * 2, 1, 0, 0));
            floormat = mat4mul(floormat, mat4settranslation(0, -(ydist / largestdist) / 2, 0));
            break;

        case "+Y":
            floormat = mat4mul(floormat, mat4settranslation(0, -(ydist / largestdist) / 2, 0));
            break;
    }

    if(framenumber < maxsamples)
    {
        model = mat4mul(model, mat4setrotation(angle[0], 0, 1, 0));
        model = mat4mul(model, mat4setrotation(angle[1], 1, 0, 0));
        floormat = mat4mul(floormat, mat4setrotation(angle[0], 0, 1, 0));
        floormat = mat4mul(floormat, mat4setrotation(angle[1], 1, 0, 0));
        shadowfloormat = Array(4);
        shadowmat = Array(4);
        shadowpersp = Array(4);
        lightvector = Array(4);
        shadowjitter = 2.0;
        unmodshadowpersp = mat4setperspective(0.785398, 1, 0.1, 1000.0);

        for(i = 0; i < 4; i++)
        {
            lightangle = shadowangle[i] * RAD;
            shadowfloormat[i] = floormat;
            shadowfloormat[i] = mat4mul(shadowfloormat[i], mat4setrotation(lightdir[i][0] + getcirclejitterx(framenumber) * lightangle, 0, 1, 0));
            shadowfloormat[i] = mat4mul(shadowfloormat[i], mat4setrotation(lightdir[i][1] + getcirclejittery(framenumber) * lightangle, 1, 0, 0));
            shadowmat[i] = model;
            shadowmat[i] = mat4mul(shadowmat[i], mat4setrotation(lightdir[i][0] + getcirclejitterx(framenumber) * lightangle, 0, 1, 0));
            shadowmat[i] = mat4mul(shadowmat[i], mat4setrotation(lightdir[i][1] + getcirclejittery(framenumber) * lightangle, 1, 0, 0));
            lightmat = mat4loadidentity();
            lightmat  = mat4mul(lightmat, mat4setrotation(lightdir[i][0] + getcirclejitterx(framenumber) * lightangle, 0, 1, 0));
            lightmat  = mat4mul(lightmat, mat4setrotation(lightdir[i][1] + getcirclejittery(framenumber) * lightangle, 1, 0, 0));
            lightvector[i] = vec3mat4mul(zlightvector, mat4invert((lightmat)));
            shadowpersp[i] = mat4mul(unmodshadowpersp, mat4settranslation(shadowjitter / shadowbufres[i] * getsquarejitterx(framenumber), shadowjitter / shadowbufres[i] * getsquarejittery(framenumber), 0));
        }

        if(drawfloor)
        {
            shadowview = mat4settranslation(0, 0, -4.0);
        }
        else
        {
            shadowview = mat4settranslation(0, 0, -2.0);
        }

        for(i = 0; i < 4; i++)
        {
            if(use_shadows[i])
            {
                beginpass(shadowbuffer[i]);
                {
                    wireframe(0);
                    depthtest(1);
                    culling(CULL_NONE);
                    clear(1, 0, 0, 1);
                    cleardepth();
                    bindshader(shadowbufshader);
                    bindattribute("in_Position", MESH_FLAG_POSITION);
                    bindattribute("in_Normals", MESH_FLAG_NORMAL);
                    setuniformmat4("modelview", mat4mul(shadowmat[i], shadowview));
                    setuniformmat4("persp", shadowpersp[i]);
                    drawmesh(mesh);

                    if(drawfloor && drawfloorshadowbuf[i])
                    {
                        setuniformmat4("modelview", mat4mul(shadowfloormat[i], shadowview));
                        setuniformmat4("persp", shadowpersp[i]);
                        drawmesh(floor);
                    }

                    bindshader(-1);
                }
                endpass();
            }
        }

        if(drawwireframe)
        {
            wireframe(1);
        }

        beginpass(gbuffer);
        {
            depthtest(1);
            culling(CULL_BACK);
            clear(0, 0, 0, 0);
            clear(0, 0, 0, 1, 1);
            cleardepth();
            view = mat4settranslation(pos[0], pos[1], zoom);
            persp = mat4setperspective(0.785398, RENDER_WIDTH / RENDER_HEIGHT, 0.1, 1000.0);

            if(framenumber < maxsamples)
            {
                jittersize = 1.0;
                persp = mat4mul(persp, mat4settranslation(jittersize / RENDER_WIDTH * getsquarejitterx(framenumber), jittersize / RENDER_HEIGHT * getsquarejittery(framenumber), 0));
            }

            perspmodelviewmat = mat4mul(mat4mul(model, view), persp);
            perspfloorviewmat = mat4mul(mat4mul(floormat, view), persp);
            bindshader(meshshader);
            bindattribute("in_Position", MESH_FLAG_POSITION);
            bindattribute("in_Normals", MESH_FLAG_NORMAL);
            setuniformmat4("modelview", mat4mul(model, view));
            setuniformmat4("normalmodelview", mat4transpose(mat4invert(mat4mul(model, view))));
            setuniformmat4("perspmodelview", perspmodelviewmat);
            setuniformmat4("shadowmodelview", mat4mul(shadowmat, view));
            setuniformmat4("persp", persp);
            setuniformf("materialcolor", matcolor[0], matcolor[1], matcolor[2]);
            setuniformi("calculatenormals", calculatenormals);
            setuniformi("doublesided", doublesided);
            drawmesh(mesh);

            if(drawfloor)
            {
                setuniformf("materialcolor", 0.6, 0.6, 0.6);
                setuniformmat4("modelview", mat4mul(floormat, view));
                setuniformmat4("normalmodelview", mat4transpose(mat4invert(mat4mul(floormat, view))));
                setuniformmat4("perspmodelview", perspfloorviewmat);
                drawmesh(floor);
            }

            bindshader(-1);
        }
        endpass();
        wireframe(0);
        beginpass(accumbuffer);
        {
            depthtest(0);

            if(framenumber == 0)
            {
                clear(0, 0, 0, 0);
            }

            blend(1);
            blendfunc(GL_ONE, GL_ONE);
            blendfuncseparate(GL_ONE, GL_ONE, GL_ONE, GL_ONE);
            culling(CULL_NONE);
            cleardepth();
            view = mat4settranslation(pos[0], pos[1], zoom);
            persp = mat4setperspective(0.785398, RENDER_WIDTH / RENDER_HEIGHT, 0.1, 1000.0);

            if(framenumber < maxsamples)
            {
                persp = mat4mul(persp, mat4settranslation(1 / RENDER_WIDTH * getsquarejitterx(framenumber), 1 / RENDER_HEIGHT * getsquarejittery(framenumber), 0));
            }

            perspmodelviewmat = mat4mul(mat4mul(model, view), persp);
            perspshadowviewmat = mat4mul(mat4mul(shadowmat, view), persp);
            bindshader(deferred);
            bindattribute("in_Position", MESH_FLAG_POSITION);
            bindattribute("in_Uv", MESH_FLAG_TEXCOORD0);
            setuniformf("lightvector", lightvector[0].x, lightvector[0].y, lightvector[0].z);
            setuniformf("lightvector1", lightvector[1].x, lightvector[1].y, lightvector[1].z);
            setuniformf("lightvector2", lightvector[2].x, lightvector[2].y, lightvector[2].z);
            setuniformf("lightvector3", lightvector[3].x, lightvector[3].y, lightvector[3].z);
            setuniformf("lightcolor", lightcolor[0][0], lightcolor[0][1], lightcolor[0][2]);
            setuniformf("lightcolor1", lightcolor[1][0], lightcolor[1][1], lightcolor[1][2]);
            setuniformf("lightcolor2", lightcolor[2][0], lightcolor[2][1], lightcolor[2][2]);
            setuniformf("lightcolor3", lightcolor[3][0], lightcolor[3][1], lightcolor[3][2]);
            setuniformf("spec", matspec);
            setuniformi("grid", grid);
            setuniformi("colorgrid", colorgrid);
            setuniformf("gloss", matgloss);
            setuniformi("use_shadows", use_shadows[0]);
            setuniformi("use_shadows1", use_shadows[1]);
            setuniformi("use_shadows2", use_shadows[2]);
            setuniformi("use_shadows3", use_shadows[3]);
            setuniformf("cavityscale", cavityscale + 0.5);
            setuniformf("clearcolor", clearcolor[0], clearcolor[1], clearcolor[2], clearcolor[3]);
            setuniformmat4("modelview", mat4mul(model, view));
            setuniformmat4("shadowmatrix", mat4mul(mat4mul(shadowmat[0], shadowview), shadowpersp[0]));
            setuniformmat4("shadowmatrix1", mat4mul(mat4mul(shadowmat[1], shadowview), shadowpersp[1]));
            setuniformmat4("shadowmatrix2", mat4mul(mat4mul(shadowmat[2], shadowview), shadowpersp[2]));
            setuniformmat4("shadowmatrix3", mat4mul(mat4mul(shadowmat[3], shadowview), shadowpersp[3]));
            setuniformmat4("invfinal", mat4invert(perspmodelviewmat));
            setuniformf("aspect", RENDER_WIDTH / RENDER_HEIGHT);
            bindrendertarget("normal", gbuffer, 1);
            bindrendertarget("diffuse", gbuffer, 0);
            bindrendertarget("shadowbuf", shadowbuffer[0], 0, GL_LINEAR, GL_LINEAR, GL_CLAMP_TO_EDGE, GL_CLAMP_TO_EDGE);
            bindrendertarget("shadowbuf1", shadowbuffer[1], 0, GL_LINEAR, GL_LINEAR, GL_CLAMP_TO_EDGE, GL_CLAMP_TO_EDGE);
            bindrendertarget("shadowbuf2", shadowbuffer[2], 0, GL_LINEAR, GL_LINEAR, GL_CLAMP_TO_EDGE, GL_CLAMP_TO_EDGE);
            bindrendertarget("shadowbuf3", shadowbuffer[3], 0, GL_LINEAR, GL_LINEAR, GL_CLAMP_TO_EDGE, GL_CLAMP_TO_EDGE);
            drawmesh(plane);
            bindshader(-1);
            blend(0);
        }
        endpass();
        framenumber++;
    }

    if((KEY_ANY & PRESSED) && framenumber == 15 || !(KEY_ANY & PRESSED) || MOUSE_ANY & PRESSED)
    {
        beginpass();
        {
            depthtest(0);
            blend(1);
            blendfuncseparate(GL_ONE, GL_ONE_MINUS_SRC_ALPHA, GL_ONE, GL_ONE);
            clear(clearcolor[0], clearcolor[1], clearcolor[2], clearcolor[3]);
            culling(CULL_NONE);
            cleardepth();
            bindshader(post);
            bindattribute("in_Position", MESH_FLAG_POSITION);
            bindattribute("in_Uv", MESH_FLAG_TEXCOORD0);
            setuniformf("samples", framenumber);
            bindrendertarget("diffuse", accumbuffer, 0);
            drawmesh(plane);
            bindshader(-1);
            blend(0);
        }
        endpass();
    }

    if(KEY_D & PRESSED)
    {
        framenumber = 0;
        debugmode(DEBUG_RENDERALLSTEPS);
        debugclip(1);
    }
    else
    {
        debugmode(DEBUG_OFF);
    }

    if(KEY_Q & PRESSED)
    {
        exit();
    }
}

function resize()
{
    framenumber = 0;
}

function filechange(filename)
{
    print("file changed", filename);

    if(filename == "config.json")
    {
        loadconfig();
    }

    bbox = getmeshbbox(mesh);
    setupcenter();
    framenumber = 0;
}

function filedrop(files)
{
    if(typeof files[0] == "string")
    {
        if(ismesh(files[0]))
        {
            destroymesh(mesh);
            meshfilename = files[0];
            mesh = loadmesh(meshfilename);
            bbox = getmeshbbox(mesh);
            ext = meshfilename.substr(meshfilename.lastIndexOf('.') + 1).toLowerCase();
            setupcenter();
            loadconfig();
            framenumber = 0;
            loop();
        }
    }
}
