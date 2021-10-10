#version 440
uniform sampler2D litcolor;;
uniform sampler2D normal;
uniform sampler2D diffuse;
out vec4 color;
in vec2 texcoord;
uniform vec2 texturesize = vec2(10, 10);
uniform float useed = 0;
uniform mat4 invpersp;
uniform bool enablegi = true;
uniform float indirectstr = 1;

vec2 mod_dither3(vec2 u)
{
    float noiseX = mod(u.x + u.y + mod(208. + u.x * 3.58, 13. + mod(u.y * 22.9, 9.)), 7.) * .143;
    float noiseY = mod(u.y + u.x + mod(203. + u.y * 3.18, 12. + mod(u.x * 27.4, 8.)), 6.) * .139;
    return vec2(noiseX, noiseY) * 2.0 - 1.0;
}

vec2 dither(vec2 coord, float seed, vec2 size)
{
    float noiseX = ((fract(1.0 - (coord.x + seed * 1.0) * (size.x / 2.0)) * 0.25) + (fract((coord.y + seed * 2.0) * (size.y / 2.0)) * 0.75)) * 2.0 - 1.0;
    float noiseY = ((fract(1.0 - (coord.x + seed * 3.0) * (size.x / 2.0)) * 0.75) + (fract((coord.y + seed * 4.0) * (size.y / 2.0)) * 0.25)) * 2.0 - 1.0;
    return vec2(noiseX, noiseY);
}

vec3 depthtoworldpos(vec2 screenpos, float d)
{
    vec4 pos;
    pos.xy = (screenpos * 2.0 - 1.0);
    pos.z = d;
    pos.w = 1;
    pos = invpersp * pos;
    pos.xyz /= pos.w;
    return pos.xyz ;
}
float lenSq(vec3 vector)
{
    return pow(vector.x, 2.0) + pow(vector.y, 2.0) + pow(vector.z, 2.0);
}
vec3 lightSample(vec2 samplecoord, vec3 innormal, vec3 pos, float d)
{
    vec3 lightsample = texture(litcolor, samplecoord).xyz ;
    vec4 nbuf = texture(normal, samplecoord.xy);
    vec3 samplepos = depthtoworldpos(samplecoord, nbuf.w);
    vec3 lightpath = samplepos - pos;
    vec3 lightdir = normalize(lightpath);
    //falloff calculations
    float cosemit  = clamp(dot(lightdir, -nbuf.xyz), 0.0, 1.0); //emit only in one direction
    float coscatch = clamp(dot(lightdir, innormal),  0.0, 1.0); //recieve light from one direction
    //float distfall = 1;//pow(lenSq(lightpath), 0.1) + 1.0;        //fall off with distance
    float occlusion = 1;

    for(float i = 0; i < 1; i += 0.2)
    {
        vec3 interp = mix(vec3(samplecoord.xy, nbuf.w), vec3(texcoord.xy, d), i);

        if(interp.z > texture(normal, interp.xy).w)
        {
            occlusion = 0;
        }
    }

    return lightsample * coscatch * cosemit * occlusion;
}
uniform int SAMPLES = 12;

void main()
{
    vec4 incolor = texture(litcolor, texcoord.xy) ;

    if(!enablegi)
    {
        color = incolor;
    }
    else
    {
        vec4 nbuf = texture(normal, vec2(texcoord.x, texcoord.y));
        vec4 diffuse = texture(diffuse, vec2(texcoord.x, texcoord.y));
        vec3 centerpos = depthtoworldpos(texcoord.xy, nbuf.w);
        vec3 indirect = vec3(0);
        float dlong = 3.1415 * (3.0 - sqrt(5.0));
        float dz = 1.0 / float(SAMPLES);
        float Long = 0.0;
        float z = 1.0 - dz / 2.0;

        for(int i = 0; i < SAMPLES; i++)
        {
            float r = sqrt(1.0 - z);
            vec2 point = vec2((cos(Long) * r), (sin(Long) * r)) * 0.5;
            z = z - dz;
            Long = Long + dlong;
            //vec2 doffset = dither(texcoord.xy, (i * 20 + useed * 0.2512123) / 100, texturesize) * 0.5;
            vec2 doffset = dither(texcoord.xy, (i * 20 + useed* 0.2512123) / 100, texturesize) * 0.5;
            indirect += lightSample(doffset + point + texcoord.xy, nbuf.xyz, centerpos, nbuf.w);
        }

        color.xyz = (diffuse.xyz * indirect / SAMPLES * indirectstr) + incolor.xyz;
        color.w = incolor.w;
    }
}
