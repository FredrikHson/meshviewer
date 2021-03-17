print("initing");
filename = getoptionalstring("file", "");

shadowbuffer = createrendertarget(1024, 1024, 1, GL_RGBA, GL_RGBA32F, 0);

if(filename == "")
{
    mesh = generateplane(10, 10, 1, 1);
}
else
{
    mesh = loadmesh(filename);
}

bbox = getmeshbbox(mesh);
meshshader = loadshader("mesh.vert", "mesh.frag", "mesh.geom", 0, 0);
shadowbufshader = loadshader("shadowbuf.vert", "shadowbuf.frag", 0, 0, 0);
wireframeshader = loadshader("mesh.vert", "wireframe.frag", 0, 0, 0);
blit = loadshader("blit.vert", "blit.frag", 0, 0, 0);

plane = generateplane(50);

//cube = loadmesh("cube.stl");
rotx = 0.785398;
roty = -0.785398 / 2;
lightx = 0;
lighty = 0;

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

print(bbox);
print(center);
up = 3;
step = 0;
zoom = -1.5;

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
    } : null;
}

function loop()
{
    if((KEY_LEFT_SHIFT & PRESSED || KEY_RIGHT_SHIFT & PRESSED))
    {
        if(MOUSE_INSIDE)
        {
            if(MOUSE_1 & PRESSED)
            {
                lightx -= MOUSE_DELTA_X * 0.01;
                lighty -= MOUSE_DELTA_Y * 0.01;
            }
        }

        if(KEY_Z & PRESSED)
        {
            up = 6;
        }

        if(KEY_Y & PRESSED)
        {
            up = 5;
        }

        if(KEY_X & PRESSED)
        {
            up = 4;
        }
    }
    else
    {
        if(MOUSE_INSIDE)
        {
            if(MOUSE_1 & PRESSED)
            {
                rotx += MOUSE_DELTA_X * 0.01;
                roty += MOUSE_DELTA_Y * 0.01;
            }
        }

        if(KEY_Z & PRESSED)
        {
            up = 3;
        }

        if(KEY_Y & PRESSED)
        {
            up = 2;
        }

        if(KEY_X & PRESSED)
        {
            up = 1;
        }

        if(MOUSE_2 & PRESSED)
        {
            zoom += MOUSE_DELTA_Y * 0.01;
        }
    }

    lightvector = {x: 0, y: 0, z: 1};
    model = mat4loadidentity();
    model = mat4mul(model, mat4settranslation(-center.x, -center.y, -center.z));
    model = mat4mul(model, mat4setscale(1 / largestdist));

    switch(up)
    {
        case 3:
            model = mat4mul(model, mat4setrotation(1.5708, 1, 0, 0));
            break;

        case 6:
            model = mat4mul(model, mat4setrotation(1.5708, -1, 0, 0));
            break;

        case 1:
            model = mat4mul(model, mat4setrotation(1.5708, 0, 0, -1));
            break;

        case 4:
            model = mat4mul(model, mat4setrotation(1.5708, 0, 0, 1));
            break;

        case 5:
            model = mat4mul(model, mat4setrotation(1.5708 * 2, 1, 0, 0));
            break;
    }

    model = mat4mul(model, mat4setrotation(rotx, 0, 1, 0));
    model = mat4mul(model, mat4setrotation(roty, 1, 0, 0));
    shadowmat = model;
    shadowmat = mat4mul(shadowmat, mat4setrotation(lightx, 0, 1, 0));
    shadowmat = mat4mul(shadowmat, mat4setrotation(lighty, 1, 0, 0));
    lightmat = mat4loadidentity();
    lightmat  = mat4mul(lightmat, mat4setrotation(lightx, 0, 1, 0));
    lightmat  = mat4mul(lightmat, mat4setrotation(lighty, 1, 0, 0));
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

    ccolor = hexToRgb("1c1e26");
    color = hexToRgb("#b877db");

    if (filename.match(/\.stl$/i)) {
        color = hexToRgb("#95c4ce");
    } else if (filename.match(/\.obj$/i)) {
        color = hexToRgb("#fab38e");
    } else if (filename.match(/\.blend$/i)) {
        color = hexToRgb("#ec6a88");
    }

    beginpass();
    {
        depthtest(1);
        culling(CULL_NONE);
        clear(ccolor.r, ccolor.g, ccolor.b);
        cleardepth();
        view = mat4settranslation(0, 0, zoom);
        persp = mat4setperspective(0.785398, RENDER_WIDTH / RENDER_HEIGHT, 0.1, 1000.0);
        bindshader(meshshader);
        bindattribute("in_Position", MESH_FLAG_POSITION);
        bindattribute("in_Normals", MESH_FLAG_NORMAL);
        setuniformmat4("modelview", mat4mul(model, view));
        setuniformmat4("shadowmodelview", mat4mul(shadowmat, view));
        setuniformmat4("persp", persp);
        setuniformf("lightvector", lightvector.x, lightvector.y, lightvector.z);
        setuniformf("materialcolor", color.r, color.g, color.b);
        drawmesh(mesh);
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

    if(KEY_Q & PRESSED)
    {
        exit();
    }

    //debugrange(-10,100);
    //debugrange(-0.010,0.01);

    if (KEY_Q & PRESSED) {
        exit();
    }
}
