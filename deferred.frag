#version 440
uniform sampler2D normal;
uniform sampler2D diffuse;
uniform sampler2D shadowbuf;
uniform sampler2D shadowbuf1;
uniform sampler2D shadowbuf2;
uniform sampler2D shadowbuf3;
uniform float cavityscale = 1.0;
uniform vec3 lightvector = vec3(0, 1, 1);
uniform vec3 lightvector1 = vec3(0, 1, 0.25);
uniform vec3 lightvector2 = vec3(0.2, -1, .25);
uniform vec3 lightvector3 = vec3(0.2, -1, .25);
uniform vec3 lightvector4 = vec3(0.2, -1, .25);
// assume that colors are in srgb space already
uniform vec3 lightcolor = vec3(1.0, 1.0, 1.0);
uniform vec3 lightcolor1 = vec3(0.4, 0.35, 0.35);
uniform vec3 lightcolor2 = vec3(0.4, 0.3, 0.0);
uniform vec3 lightcolor3 = vec3(0.4, 0.3, 0.0);
uniform vec3 materialcolor = vec3(0.8, 0.8, 0.8);
uniform float gloss = 80.0;
uniform float spec = 0.125;
uniform bool grid = false;
uniform bool colorgrid = false;
uniform bool use_shadows = false;
uniform bool use_shadows1 = false;
uniform bool use_shadows2 = false;
uniform bool use_shadows3 = false;
#define PI 3.1415926538
#define HPI 1.5707963269
uniform mat4 invfinal;
uniform mat4 shadowmatrix;
uniform mat4 shadowmatrix1;
uniform mat4 shadowmatrix2;
uniform mat4 shadowmatrix3;
uniform vec4 clearcolor;
out vec4 color;
in vec2 texcoord;
uniform float aspect = 1;

vec3 overlay(vec3 base, float blend)
{
    vec3 fin;
    fin.x = base.x < 0.5 ? (2.0 * base.x * blend) : (1.0 - 2.0 * (1.0 - base.x) * (1.0 - blend));
    fin.y = base.y < 0.5 ? (2.0 * base.y * blend) : (1.0 - 2.0 * (1.0 - base.y) * (1.0 - blend));
    fin.z = base.z < 0.5 ? (2.0 * base.z * blend) : (1.0 - 2.0 * (1.0 - base.z) * (1.0 - blend));
    return fin;
}
vec2 normaltolonglat(vec3 normal)
{
    vec2 longlat;
    longlat.x = atan(normal.z, normal.x);
    longlat.y = asin(-normal.y);
    longlat = (longlat + HPI) / PI;
    return longlat;
}

float ggx(vec3 N, vec3 V, vec3 L, float roughness, float F0)
{
    float alpha = roughness * roughness;
    vec3 H = normalize(L - V);
    float dotLH = max(0.0, dot(L, H));
    float dotNH = max(0.0, dot(N, H));
    float dotNL = max(0.0, dot(N, L));
    float alphaSqr = alpha * alpha;
    float denom = dotNH * dotNH * (alphaSqr - 1.0) + 1.0;
    float D = alphaSqr / (PI * denom * denom);
    float F = F0 + (1.0 - F0) * pow(1.0 - dotLH, 5.0);
    float k = 0.5 * alpha;
    float k2 = k * k;
    return min(1000.0f, dotNL * D * F / (dotLH * dotLH * (1.0 - k2) + k2));
}

vec3 light(vec3 normal, vec3 dir, vec3 view, vec3 lc, vec3 mc)
{
    vec3 outcolor = vec3(0);

    if(length(normal) < 0.1)
    {
        return vec3(0);
    }

    vec3 n = normalize(normal);
    vec3 ndir = normalize(dir);
    float s = ggx(n, normalize(view), ndir, gloss, spec);
    float d = max(0, dot(n, ndir)) * (1 - s);
    outcolor = vec3(d) * pow(lc, vec3(2.2)) * pow(mc, vec3(2.2));
    outcolor += vec3(s) * pow(lc, vec3(2.2));
    return outcolor;
}

vec3 depthtoworldpos(float d)
{
    vec4 pos;
    pos.xy = (texcoord * 2.0 - 1.0);
    pos.z = d;
    pos.w = 1;
    pos = invfinal * pos;
    pos.xyz /= pos.w;
    return pos.xyz ;
}

vec3 getshadowbuff(vec3 pos, mat4 smat, sampler2D sbuf, bool s)
{
    if(!s)
    {
        return vec3(1);
    }

    vec4 shadowspacepos = smat * vec4(pos, 1.0) ;
    vec3 zcorrected = shadowspacepos.xyz / shadowspacepos.w;
    float shadows = texture(sbuf, zcorrected.xy * 0.5 + 0.5).x;

    if(shadows < zcorrected.z - 0.00001)
    {
        return vec3(0);
    }

    return vec3(1);
}

float gridline(float p)
{
    float gridsize = 10.0;
    p = (p / gridsize);
    float x = fract(p);
    x = min(x, 1.0 - x) * 2;
    x = max(0, (x * 30) - 29);
    x = min(1, x * 2);
    return 1 - x;
}

void main()
{
    float x = texture(normal, vec2(texcoord.x + dFdx(texcoord.x), texcoord.y)).x;
    x -= texture(normal, vec2(texcoord.x - dFdx(texcoord.x), texcoord.y)).x;
    float y = texture(normal, vec2(texcoord.x, texcoord.y + dFdy(texcoord.y))).y;
    y -= texture(normal, vec2(texcoord.x, texcoord.y - dFdy(texcoord.y))).y;
    float cavity = mix(0.5, cavityscale, x + y);
    vec4 tc = texture(diffuse, vec2(texcoord.x, texcoord.y));
    vec4 nbuf = texture(normal, vec2(texcoord.x, texcoord.y));
    vec3 tn = nbuf.xyz;
    vec3 l = vec3(0);
    vec3 pos = depthtoworldpos(nbuf.w);

    if(grid && nbuf.w < 1.0)
    {
        if(colorgrid)
        {
            vec3 gridcolor = {1, 1, 1};
            gridcolor.yz =  color.yz * (gridline(pos.x) < 0.999 ? 0.0 : 1.0);
            gridcolor.xz =  color.xz * (gridline(pos.y) < 0.999 ? 0.0 : 1.0);
            gridcolor.xy =  color.xy * (gridline(pos.z) < 0.999 ? 0.0 : 1.0);
            tc.xyz = mix(gridcolor, tc.xyz, gridline(pos.x) * gridline(pos.y) * gridline(pos.z));
        }
        else
        {
            if(length(tc.xyz) > 0.5)
            {
                tc.xyz = mix(vec3(0, 0, 0), tc.xyz, pow((gridline(pos.x) + gridline(pos.y) + gridline(pos.z)) / 3, 2));
            }
            else
            {
                tc.xyz = mix(vec3(1, 1, 1), tc.xyz, pow((gridline(pos.x) + gridline(pos.y) + gridline(pos.z)) / 3, 2));
            }
        }
    }

    vec3 v = normalize(vec3((texcoord.x * 2 - 1) * aspect, (texcoord.y * 2 - 1), -1));
    tc.xyz = min(vec3(1), max(vec3(0), overlay(tc.xyz, cavity)));
    l += light(tn, lightvector, v, lightcolor, tc.xyz) * getshadowbuff(pos, shadowmatrix, shadowbuf, use_shadows);
    l += light(tn, lightvector1, v, lightcolor1, tc.xyz) * getshadowbuff(pos, shadowmatrix1, shadowbuf1, use_shadows1);
    l += light(tn, lightvector2, v, lightcolor2, tc.xyz) * getshadowbuff(pos, shadowmatrix2, shadowbuf2, use_shadows2);
    l += light(tn, lightvector3, v, lightcolor3, tc.xyz) * getshadowbuff(pos, shadowmatrix3, shadowbuf3, use_shadows3);
    color.xyz = l.xyz;

    if(nbuf.w >= 1.0)
    {
        color = tc;
    }
    else
    {
        color.w = 1;
    }
}
